import { Router, raw } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, requireLiveSession } from '../middleware/auth.js';
import { publicLimiter } from '../middleware/rateLimit.js';
import { batchIdParam, createPaymentSchema, paymentReferenceParam } from '../schemas/index.js';
import * as paymentService from '../services/paymentService.js';
import { paymentProvider } from '../payments/index.js';
import { assertNotProduction } from '../payments/stub.js';
import { AppError } from '../middleware/error.js';

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
    const signature =
      (req.header('x-paystack-signature') ??
        req.header('verif-hash') ??
        req.header('x-signature')) ||
      undefined;

    const body = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body ?? '');
    const result = paymentProvider.parseWebhook(body, signature);

    // Always 200: a gateway retries on non-2xx, and an unverifiable payload will
    // never start verifying. Rejecting it loudly only invites a retry storm.
    if (!result) return res.status(200).json({ received: true });

    await paymentService.settlePayment(result.reference, result.status);
    res.status(200).json({ received: true });
  })
);

/**
 * Test-only settlement for the stub gateway, standing in for a real webhook.
 * Refuses to run in production, and refuses outright unless the stub is active.
 */
router.post(
  '/:reference/simulate',
  publicLimiter,
  validate({ params: paymentReferenceParam }),
  asyncHandler(async (req, res) => {
    assertNotProduction();
    if (paymentProvider.name !== 'stub') {
      throw new AppError(404, 'Not available');
    }
    const outcome = req.body?.outcome === 'FAILED' ? 'FAILED' : 'PAID';
    const payment = await paymentService.settlePayment(req.params.reference, outcome);
    if (!payment) throw new AppError(404, 'Payment not found');
    res.json({ payment });
  })
);

/** Public lookup so the checkout page can show what is being paid for. */
router.get(
  '/:reference',
  publicLimiter,
  validate({ params: paymentReferenceParam }),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.getPaymentByReference(req.params.reference);
    if (!payment) throw new AppError(404, 'Payment not found');
    res.json({ payment });
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
