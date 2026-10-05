import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { chainEnabled } from './client.js';
import { reconcileBatchChain } from '../services/batchService.js';

/**
 * Periodically catches up batches whose on-chain record fell behind.
 *
 * `advanceBatch` does not fail a request when a relay fails — an RPC timeout or
 * an empty relayer should not cost an operator their work — so something has to
 * come back for those batches, or they keep a database record with no chain
 * record.
 *
 * A few at a time, sequentially: parallel relays would compete for nonces with
 * operators doing real work.
 */
const INTERVAL_MS = 10 * 60 * 1000;
const BATCH_LIMIT = 5;

let timer: NodeJS.Timeout | null = null;
let running = false;

async function sweep(): Promise<void> {
  // Passes can overlap if one runs long; the second would replay work the first
  // is mid-way through and fight it for nonces.
  if (running || !chainEnabled()) return;
  running = true;

  try {
    const behind = await prisma.batch.findMany({
      where: { chainStatus: { not: 'CONFIRMED' } },
      orderBy: { createdAt: 'asc' },
      select: { batchId: true },
      take: BATCH_LIMIT,
    });
    if (behind.length === 0) return;

    logger.info({ count: behind.length }, 'Chain sweep: batches behind');

    for (const { batchId } of behind) {
      try {
        const { chainState, replayed } = await reconcileBatchChain(batchId);
        if (replayed.length) {
          logger.info({ batchId, replayed: replayed.length, chainState }, 'Chain sweep: caught up');
        }
      } catch (err) {
        // Expected for a batch that cannot be repaired yet — an operator with
        // no wallet, or an RPC still down. The next pass tries again.
        logger.warn({ err, batchId }, 'Chain sweep: still behind');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Chain sweep failed');
  } finally {
    running = false;
  }
}

/** Starts the sweeper. No-op when the chain is off, so it is safe to call always. */
export function startChainSweeper(): void {
  if (timer || !chainEnabled()) return;
  // unref so a pending timer never holds the process open during a shutdown.
  timer = setInterval(() => void sweep(), INTERVAL_MS);
  timer.unref();
  logger.info({ everyMinutes: INTERVAL_MS / 60000 }, 'Chain sweeper started');
  void sweep();
}
