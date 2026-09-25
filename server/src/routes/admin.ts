import { Router } from 'express';
import { formatEther } from 'ethers';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole, requireLiveSession } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../schemas/index.js';
import { chainEnabled, provider, relayer } from '../chain/client.js';
import { env } from '../env.js';
import { getSettings, updateSettings } from '../services/settingsService.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Health of the relayer wallet — the account that sponsors gas for every
 * operator's on-chain write. When it runs dry, nothing reaches the chain, so
 * admins need to see it coming rather than discover it through failures.
 */
router.get(
  '/wallet',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    if (!chainEnabled()) {
      return res.json({ wallet: null, chainEnabled: false });
    }
    try {
      const address = relayer().address;
      const wei = await provider().getBalance(address);
      const balance = Number(formatEther(wei));
      const low = env.RELAYER_LOW_BALANCE;
      const critical = low / 2;

      res.json({
        chainEnabled: true,
        wallet: {
          address,
          balance,
          symbol: 'ETH',
          chainId: env.CHAIN_ID,
          lowThreshold: low,
          criticalThreshold: critical,
          status:
            balance <= critical ? 'CRITICAL' : balance <= low ? 'LOW' : 'HEALTHY',
        },
      });
    } catch (err) {
      logger.error({ err }, 'Could not read the relayer wallet balance');
      res.status(502).json({ error: 'Could not reach the network to read the balance' });
    }
  })
);

/** Anyone signed in needs to know whether fees apply; only admins may change them. */
router.get(
  '/settings',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ settings: await getSettings() });
  })
);

router.patch(
  '/settings',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: updateSettingsSchema }),
  requireLiveSession,
  asyncHandler(async (req, res) => {
    const settings = await updateSettings({ feesEnabled: req.body.feesEnabled });
    logger.info({ settings, by: req.user!.sub }, 'Payment settings updated');
    res.json({ settings });
  })
);

export default router;
