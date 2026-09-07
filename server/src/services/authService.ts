import { prisma } from '../lib/prisma.js';
import { verifyPassword, hashPassword } from '../lib/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiry,
} from '../lib/jwt.js';
import { sendPasswordResetEmail, sendInviteEmail } from '../lib/email.js';
import { logger } from '../lib/logger.js';
import { env } from '../env.js';
import { AppError } from '../middleware/error.js';

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  location: true,
  wallet: { select: { address: true, chain: true } },
} as const;

async function issueTokens(user: { id: string; role: 'ADMIN' | 'OPERATOR'; email: string }) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const { token: refreshToken, hash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { tokenHash: hash, userId: user.id, expiresAt: refreshExpiry() },
  });
  return { accessToken, refreshToken };
}

/**
 * Who, if anyone, is already signed in on this browser.
 *
 * The refresh cookie is per-browser, so without this check a second sign-in
 * would silently overwrite the first: the original tab keeps working until its
 * access token lapses, then refreshes into the *new* user's session and starts
 * acting as them. One session per browser removes that whole class of bug.
 */
export async function currentSessionUser(rawToken?: string) {
  if (!rawToken) return null;
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawToken) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!record || record.revoked || record.expiresAt < new Date()) return null;
  if (isIdle(record.lastUsedAt)) return null;
  return record.user;
}

/** True when a session has sat unused past the configured idle window. */
function isIdle(lastUsedAt: Date) {
  return Date.now() - lastUsedAt.getTime() > env.SESSION_IDLE_MINUTES * 60 * 1000;
}

export async function login(email: string, password: string, existingRefreshToken?: string) {
  const active = await currentSessionUser(existingRefreshToken);
  if (active && active.email !== email) {
    throw new AppError(
      409,
      `${active.name} is already signed in on this browser. Sign out first, then sign in.`
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Constant-ish work whether or not the user exists, to blunt user enumeration.
  const ok = user ? await verifyPassword(user.passwordHash, password) : await verifyPassword('$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', password);

  // Generic failure for everyone: never confirm whether an account exists. The
  // invitation hint is appended unconditionally, so it helps an invited user
  // without revealing anything to someone probing addresses.
  if (!user || !ok) {
    throw new AppError(
      401,
      'Invalid email or password. If you were recently invited, use the link in your invitation email to set your password first.'
    );
  }
  if (user.status !== 'ACTIVE') {
    throw new AppError(
      403,
      'This account has been deactivated. Please contact your administrator.'
    );
  }

  // Re-authenticating replaces any prior session for this user on any device.
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revoked: false },
    data: { revoked: true },
  });

  const tokens = await issueTokens(user);
  const safe = await prisma.user.findUnique({ where: { id: user.id }, select: publicUser });
  return { ...tokens, user: safe };
}

export async function refresh(rawToken: string) {
  const hash = hashRefreshToken(rawToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });

  if (!record || record.revoked || record.expiresAt < new Date()) {
    throw new AppError(401, 'Invalid or expired session');
  }

  if (isIdle(record.lastUsedAt)) {
    // Revoke the whole family: an idle session must not be resumable.
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revoked: false },
      data: { revoked: true },
    });
    logger.info({ userId: record.userId }, 'Session expired through inactivity');
    throw new AppError(401, 'Your session expired after a period of inactivity');
  }

  if (record.user.status !== 'ACTIVE') {
    throw new AppError(401, 'Account is no longer active');
  }

  // Rotate: revoke the used token, issue a fresh pair.
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  const tokens = await issueTokens(record.user);
  const safe = await prisma.user.findUnique({
    where: { id: record.userId },
    select: publicUser,
  });
  return { ...tokens, user: safe };
}

export async function logout(rawToken: string) {
  const hash = hashRefreshToken(rawToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revoked: true } });
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const ok = await verifyPassword(user.passwordHash, current);
  if (!ok) throw new AppError(401, 'Current password is incorrect');

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next) },
  });
  // Invalidate existing sessions after a password change.
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
}

export function me(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: publicUser });
}

/**
 * Begin a password reset. Always resolves the same way (no user enumeration).
 * Emails a single-use, 1-hour token when the account exists and is active.
 */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // The HTTP response is identical either way (no user enumeration), so without
  // a log an skipped reset is indistinguishable from a delivered one — the
  // requester just never receives an email. Record why we skipped.
  if (!user) {
    logger.warn({ email }, 'Password reset requested for an unknown email — no email sent');
    return;
  }
  if (user.status !== 'ACTIVE') {
    logger.warn(
      { email, status: user.status },
      'Password reset requested for a non-ACTIVE account — no email sent. ' +
        'Reactivate the account (Admin → Operators) before resetting.'
    );
    return;
  }

  // Invalidate any outstanding reset tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  const { token, hash } = generateRefreshToken();
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const link = `${env.APP_URL}/reset-password?token=${token}`;
  logger.info({ email: user.email }, 'Password reset token issued — sending email');
  await sendPasswordResetEmail(user.email, user.name, link);
}

/** How long each kind of set-password link stays usable. */
const TOKEN_TTL_MS = {
  INVITE: 72 * 60 * 60 * 1000,
  RESET: 60 * 60 * 1000,
} as const;

/**
 * Issue a set-password link. Used for a first-time invitation and for a resend;
 * any outstanding token for the user is invalidated first, so only the newest
 * link works.
 */
export async function issueInvite(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');
  if (user.status === 'INACTIVE') {
    throw new AppError(400, 'Reactivate this account before inviting them again');
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  const { token, hash } = generateRefreshToken();
  await prisma.passwordResetToken.create({
    data: {
      purpose: 'INVITE',
      tokenHash: hash,
      userId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS.INVITE),
    },
  });

  const link = `${env.APP_URL}/accept-invite?token=${token}`;
  logger.info({ email: user.email }, 'Invitation issued');
  await sendInviteEmail(user.email, user.name, link, user.role);
  return { link };
}

/**
 * Complete an invitation: the user chooses their own password and the account
 * becomes usable. No password is ever transmitted to them.
 */
export async function acceptInvite(rawToken: string, newPassword: string) {
  const hash = hashRefreshToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });

  if (!record || record.used || record.purpose !== 'INVITE' || record.expiresAt < new Date()) {
    throw new AppError(400, 'This invitation link is invalid or has expired');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        status: 'ACTIVE',
      },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
  ]);

  logger.info({ userId: record.userId }, 'Invitation accepted — account activated');
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const hash = hashRefreshToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });

  if (!record || record.used || record.expiresAt < new Date()) {
    throw new AppError(400, 'This reset link is invalid or has expired');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    // Sign out everywhere after a reset.
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } }),
  ]);
}

export async function verifyResetToken(rawToken: string, purpose: 'INVITE' | 'RESET' = 'RESET') {
  const hash = hashRefreshToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hash },
    include: { user: { select: { status: true } } },
  });

  if (!record || record.used || record.purpose !== purpose || record.expiresAt < new Date()) {
    // Reissuing an invitation marks the previous token used, so "used" alone
    // cannot tell an accepted link from a superseded one. A user still PENDING
    // has never set a password, so their old link was replaced, not consumed.
    const supersededInvite =
      record?.used && purpose === 'INVITE' && record.user.status === 'PENDING';

    return {
      valid: false,
      reason: !record
        ? 'invalid'
        : record.purpose !== purpose
          ? 'invalid'
          : supersededInvite
            ? 'superseded'
            : record.used
              ? 'used'
              : 'expired',
    };
  }

  return { valid: true };
}
