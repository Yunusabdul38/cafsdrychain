import { prisma } from '../lib/prisma.js';
import { verifyPassword, hashPassword } from '../lib/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiry,
} from '../lib/jwt.js';
import { AppError } from '../middleware/error.js';

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  location: true,
  mustChangePassword: true,
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

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Constant-ish work whether or not the user exists, to blunt user enumeration.
  const ok = user ? await verifyPassword(user.passwordHash, password) : await verifyPassword('$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', password);

  if (!user || !ok) throw new AppError(401, 'Invalid email or password');
  if (user.status !== 'ACTIVE') throw new AppError(403, 'Account is inactive');

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

  // Rotate: revoke the used token, issue a fresh pair.
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  const tokens = await issueTokens(record.user);
  return tokens;
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
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  // Invalidate existing sessions after a password change.
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
}

export function me(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: publicUser });
}
