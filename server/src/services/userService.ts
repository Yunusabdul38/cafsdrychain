import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { hashPassword, generateTempPassword } from '../lib/password.js';
import { sendInviteEmail } from '../lib/email.js';
import { logger } from '../lib/logger.js';
import { createWalletForUser } from './walletService.js';
import { grantOperatorRoles } from '../chain/relayer.js';
import { AppError } from '../middleware/error.js';
import type { CreateUserInput } from '../schemas/index.js';

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  location: true,
  mustChangePassword: true,
  createdAt: true,
  wallet: { select: { address: true, index: true, chain: true, derivationPath: true } },
} as const;

/**
 * Admin provisions a user. Every new user atomically gets a deterministic HD
 * wallet. Operators are then authorised on-chain (role grant) out of band.
 */
export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'A user with this email already exists');

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role as Role,
        location: input.location,
        passwordHash,
        mustChangePassword: true,
      },
    });
    // Deterministic wallet derivation, atomic with the user record.
    await createWalletForUser(tx, created.id);
    return created;
  });

  const withWallet = await prisma.user.findUnique({
    where: { id: user.id },
    select: publicUser,
  });

  // Best-effort side effects (must not roll back the DB record).
  void sendInviteEmail(input.email, input.name, tempPassword);
  if (input.role === 'OPERATOR' && withWallet?.wallet) {
    grantOperatorRoles(withWallet.wallet.address)
      .then((hashes) => hashes.length && logger.info({ hashes }, 'granted operator roles'))
      .catch((err) => logger.error({ err }, 'failed to grant operator roles on-chain'));
  }

  // The temp password is returned once so the admin can relay it if email is off.
  return { user: withWallet, tempPassword };
}

export function listUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: publicUser });
}

export function getUser(id: string) {
  return prisma.user.findUnique({ where: { id }, select: publicUser });
}
