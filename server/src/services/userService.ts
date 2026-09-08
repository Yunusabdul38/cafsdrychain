import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import crypto from 'node:crypto';
import { hashPassword } from '../lib/password.js';
import { issueInvite } from './authService.js';
import { logger } from '../lib/logger.js';
import { createWalletForUser } from './walletService.js';
import { grantOperatorRoles } from '../chain/relayer.js';
import { AppError } from '../middleware/error.js';
import { env } from '../env.js';
import type { CreateUserInput } from '../schemas/index.js';

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  location: true,
  createdAt: true,
  wallet: { select: { address: true, index: true, chain: true, derivationPath: true } },
} as const;

/**
 * The account named by SEED_ADMIN_EMAIL is the way back in when everything else
 * fails: it is recreated by the seed on every boot and is the only guaranteed
 * administrator. It cannot be deactivated or deleted, by anyone, including
 * itself — otherwise a single mistaken click could leave nobody able to
 * provision operators, pause the registry, or authorise a contract upgrade.
 */
function assertNotRootAdmin(email: string, action: string) {
  const root = env.SEED_ADMIN_EMAIL?.toLowerCase();
  if (root && email.toLowerCase() === root) {
    throw new AppError(
      403,
      `${email} is the primary administrator account and cannot be ${action}.`
    );
  }
}

/** Whether this address is the protected primary administrator. */
export function isRootAdmin(email: string): boolean {
  const root = env.SEED_ADMIN_EMAIL?.toLowerCase();
  return Boolean(root && email.toLowerCase() === root);
}

/** Adds the protection flag the UI needs to hide destructive actions. */
function withFlags<T extends { email: string }>(user: T) {
  return { ...user, isRootAdmin: isRootAdmin(user.email) };
}

/**
 * Admin provisions a user. Every new user atomically gets a deterministic HD
 * wallet. Operators are then authorised on-chain (role grant) out of band.
 */
export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    // One account per email, and one role per account. Say which account is in
    // the way and what to do about it, rather than a bare "already exists".
    const article = (role: string) => (role === 'ADMIN' ? 'an administrator' : 'an operator');
    const state =
      existing.status === 'PENDING'
        ? ' Their invitation has not been accepted yet, so you can resend it instead.'
        : existing.status === 'INACTIVE'
          ? ' That account is deactivated. Reactivate it rather than creating a second one.'
          : '';
    const roleClash =
      existing.role !== input.role
        ? ` A person can hold one role only, so delete that account first if they should be ${article(
            input.role
          )} instead.`
        : '';

    throw new AppError(
      409,
      `${existing.name} already has ${article(existing.role)} account using ${
        input.email
      }.${state}${roleClash}`,
      'USER_EXISTS',
      // Enough for the client to offer the right next step rather than a dead end.
      {
        existing: {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          role: existing.role,
          status: existing.status,
        },
      }
    );
  }

  // No password is ever chosen for them. The account is parked with an
  // unguessable hash nobody holds, and stays PENDING until they set their own
  // through the invitation link, so no secret travels by email.
  const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role as Role,
        location: input.location,
        passwordHash,
        status: 'PENDING',
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
  void issueInvite(user.id).catch((err) =>
    logger.error({ err, email: input.email }, 'Failed to send the invitation email')
  );
  if (input.role === 'OPERATOR' && withWallet?.wallet) {
    // Authorise the operator's EOA on-chain so its signatures are accepted.
    grantOperatorRoles(withWallet.wallet.address)
      .then((hashes) => hashes.length && logger.info({ hashes }, 'granted operator roles'))
      .catch((err) => logger.error({ err }, 'failed to grant operator roles on-chain'));
  }

  return { user: withWallet };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: publicUser,
  });
  return users.map(withFlags);
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: publicUser });
  return user ? withFlags(user) : null;
}

export async function updateUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');
  if (status === 'INACTIVE') assertNotRootAdmin(user.email, 'deactivated');

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
    select: publicUser
  });

  // Deactivating must take effect at once, not whenever their token happens to
  // lapse. Revoking the sessions stops any refresh, and the client's heartbeat
  // signs them out within seconds.
  if (status === 'INACTIVE') {
    const { count } = await prisma.refreshToken.updateMany({
      where: { userId: id, revoked: false },
      data: { revoked: true },
    });
    logger.info({ userId: id, sessionsEnded: count }, 'Account deactivated — sessions revoked');
  }

  return updated;
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');
  assertNotRootAdmin(user.email, 'deleted');

  const batchCount = await prisma.batch.count({ where: { operatorId: id } });

  if (batchCount > 0) {
    // Perform a soft delete: deactivate the user
    await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });
    return {
      deleted: false,
      message: 'Operator deactivated. The operator record is preserved because they have active or completed batches on-chain.'
    };
  }

  // Hard delete since there are no batches linked
  await prisma.user.delete({ where: { id } });
  return {
    deleted: true,
    message: 'User deleted successfully.'
  };
}
