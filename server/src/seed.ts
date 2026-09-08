import { prisma } from './lib/prisma.js';
import { hashPassword } from './lib/password.js';
import { ensureWalletCounter, createWalletForUser } from './services/walletService.js';
import { isDerivationConfigured } from './chain/derivation.js';
import { logger } from './lib/logger.js';
import { env } from './env.js';

/**
 * Bootstraps the first admin account and the wallet counter.
 * Run once: `npm run seed`
 */
async function main() {
  await ensureWalletCounter();

  const email = (env.SEED_ADMIN_EMAIL ?? 'admin@cafsdrychain.io').toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.info(`Admin ${email} already exists — skipping.`);
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        email,
        name: 'DryChain Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        location: 'HQ',
        passwordHash,
      },
    });
    if (isDerivationConfigured()) {
      await createWalletForUser(tx, admin.id);
    }
  });

  logger.info(`Seeded admin: ${email}`);
  logger.info(`Temporary password: ${password} (change on first login)`);
  if (!isDerivationConfigured()) {
    logger.warn('MASTER_MNEMONIC not set — admin wallet not derived. Set it and re-provision users.');
  }
}

main()
  .catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
