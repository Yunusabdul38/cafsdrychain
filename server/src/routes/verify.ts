import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { publicLimiter } from '../middleware/rateLimit.js';
import { batchIdParam } from '../schemas/index.js';
import * as batchService from '../services/batchService.js';
import { verifyOnChain } from '../chain/relayer.js';

const router = Router();

// Public, unauthenticated product verification (rate-limited).
router.get(
  '/:batchId',
  publicLimiter,
  validate({ params: batchIdParam }),
  asyncHandler(async (req, res) => {
    const record = await batchService.getPublicBatch(req.params.batchId);
    const onChainValid = await verifyOnChain(record.batchId, record.metadataHash);
    res.json({ record: { ...record, onChainValid } });
  })
);

export default router;
