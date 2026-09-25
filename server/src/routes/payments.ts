import { Router, raw } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, requireLiveSession } from '../middleware/auth.js';
import { publicLimiter } from '../middleware/rateLimit.js';
import { batchIdParam, createPaymentSchema } from '../schemas/index.js';
import * as paymentService from '../services/paymentService.js';
import { getPaymentProvider } from '../payments/index.js';

const router = Router();

/**
 * Gateway callback. Mounted with a raw body parser because signatures are
 * computed over the exact bytes received — re-serialising parsed JSON would
 * change them and every webhook would fail to verify.
 *
 * Unauthenticated by necessity; authenticity comes from the signature alone.
 */
router.post(
  '/webhook',
  publicLimiter,
  raw({ type: '*/*', limit: '100kb' }),
  asyncHandler(async (req, res) => {
    // The V2 header specifically: it carries the timestamp inline, which the
    // signed message needs, and repeats v1= once per valid secret so a rotation
    // does not drop deliveries. The older X-Bachs-Signature is a bare digest
    // with no timestamp and cannot be verified on its own.
    const signature = req.header('x-bachs-signature-v2') || undefined;

    const body = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body ?? '');
    const result = getPaymentProvider().parseWebhook(body, signature);

    // Always 200: a gateway retries on non-2xx, and an unverifiable payload will
    // never start verifying. Rejecting it loudly only invites a retry storm.
    if (!result) return res.status(200).json({ received: true });

    await paymentService.settlePayment(result.reference, result.status);
    res.status(200).json({ received: true });
  })
);

export default router;

/** Batch-scoped payment routes, mounted under /api/batches. */
export const batchPaymentRoutes = Router();

batchPaymentRoutes.post(
  '/:batchId/payment',
  requireAuth,
  requireRole('OPERATOR', 'ADMIN'),
  requireLiveSession,
  validate({ params: batchIdParam, body: createPaymentSchema }),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.createPaymentForBatch(
      req.params.batchId,
      req.body.amount
    );
    res.status(201).json({ payment });
  })
);

/**
 * Force a check against the gateway for a batch whose fee has not settled.
 *
 * The webhook is the normal path; this is the recovery one, for when it lags or
 * never arrives. Operator-only: it is a support action, not something a payer
 * needs, and it can only ever record what the gateway already reports.
 */
batchPaymentRoutes.post(
  '/:batchId/payment/refresh',
  requireAuth,
  requireRole('OPERATOR', 'ADMIN'),
  requireLiveSession,
  validate({ params: batchIdParam }),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.reconcileBatchPayment(req.params.batchId);
    res.json({ payment });
  })
);

batchPaymentRoutes.post(
  '/:batchId/payment/waive',
  requireAuth,
  requireRole('OPERATOR', 'ADMIN'),
  requireLiveSession,
  validate({ params: batchIdParam }),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.waivePaymentForBatch(req.params.batchId);
    res.status(201).json({ payment });
  })
);

batchPaymentRoutes.get(
  '/:batchId/payment',
  requireAuth,
  validate({ params: batchIdParam }),
  asyncHandler(async (req, res) => {
    res.json({ payment: await paymentService.getPaymentForBatch(req.params.batchId) });
  })
);
