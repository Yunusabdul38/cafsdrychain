import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { deriveAddress, derivationPath } from '../chain/derivation.js';
import { env } from '../env.js';

/** Ensure the atomic index counter row exists (idempotent, called at boot). */
export async function ensureWalletCounter(): Promise<void> {
  await prisma.walletCounter.upsert({
    where: { id: 1 },
    create: { id: 1, value: 0 },
    update: {},
  });
}

/**
 * Allocate the next unused HD index and derive the user's deterministic wallet,
 * inside a caller-provided transaction so it commits atomically with the user.
 *
 * The atomic `increment` compiles to a single `UPDATE ... SET value = value + 1
 * RETURNING value`, so concurrent signups can never collide on an index.
 */
export async function createWalletForUser(tx: Prisma.TransactionClient, userId: string) {
  const counter = await tx.walletCounter.update({
    where: { id: 1 },
    data: { value: { increment: 1 } },
  });
  const index = counter.value;

  const address = deriveAddress(index);
  const path = derivationPath(index);

  return tx.wallet.create({
    data: {
      userId,
      index,
      address,
      chain: env.WALLET_CHAIN,
      derivationPath: path,
    },
  });
}
