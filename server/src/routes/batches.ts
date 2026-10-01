import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, requireLiveSession } from '../middleware/auth.js';
import { advanceBatchSchema, batchIdParam, createBatchSchema } from '../schemas/index.js';
import * as batchService from '../services/batchService.js';
import { AppError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(requireAuth);

// Admins see all batches; operators see all batches at their hub (location).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    let filter: { operatorId?: string; location?: string } | undefined;
    if (req.user!.role === 'OPERATOR') {
      // Fetch the operator's location so we can scope to their hub.
      const me = await prisma.user.findUnique({
        where: { id: req.user!.sub },
        select: { location: true },
      });
      // If the operator has a location, show all batches at that hub.
      // If for some reason location is null, fall back to only their own.
      filter = me?.location
        ? { location: me.location }
        : { operatorId: req.user!.sub };
    }
    res.json({ batches: await batchService.listBatches(filter) });
  })
);

router.post(
  '/',
  requireRole('OPERATOR'),
  requireLiveSession,
  validate({ body: createBatchSchema }),
  asyncHandler(async (req, res) => {
    const batch = await batchService.createBatch(req.user!.sub, req.body);
    res.status(201).json({ batch });
  })
);

router.get(
  '/:batchId',
  validate({ params: batchIdParam }),
  asyncHandler(async (req, res) => {
    res.json({ batch: await batchService.getBatch(req.params.batchId) });
  })
);

router.post(
  '/:batchId/advance',
  requireRole('OPERATOR'),
  requireLiveSession,
  validate({ params: batchIdParam, body: advanceBatchSchema }),
  asyncHandler(async (req, res) => {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    const batch = await batchService.advanceBatch(
      { id: req.user!.sub, role: req.user!.role, name: actor?.name ?? 'Operator' },
      req.params.batchId,
      req.body
    );
    res.json({ batch });
  })
);

/**
 * Push a batch's on-chain record up to what the database holds. Every write
 * and the background sweep already do this; this is the manual "Retry now".
 */
router.post(
  '/:batchId/reconcile-chain',
  requireRole('OPERATOR', 'ADMIN'),
  requireLiveSession,
  validate({ params: batchIdParam }),
  asyncHandler(async (req, res) => {
    // Operators only for their own hub, as when recording a stage. Admins may
    // repair any batch: this never changes the record, only the chain's copy.
    if (req.user!.role === 'OPERATOR') {
      const [me, batch] = await Promise.all([
        prisma.user.findUnique({ where: { id: req.user!.sub }, select: { location: true } }),
        prisma.batch.findUnique({ where: { batchId: req.params.batchId }, select: { location: true } }),
      ]);
      if (!batch) throw new AppError(404, 'Batch not found');
      if (!me?.location || me.location !== batch.location) {
        throw new AppError(403, 'You are not assigned to the hub where this batch is located');
      }
    }
    res.json(await batchService.reconcileBatchChain(req.params.batchId));
  })
);

export default router;
