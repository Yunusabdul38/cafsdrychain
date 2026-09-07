import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, requireLiveSession } from '../middleware/auth.js';
import { advanceBatchSchema, batchIdParam, createBatchSchema } from '../schemas/index.js';
import * as batchService from '../services/batchService.js';
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

export default router;
