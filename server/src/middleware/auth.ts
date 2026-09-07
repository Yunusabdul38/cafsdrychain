import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken } from '../lib/jwt.js';
import { AppError } from './error.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../env.js';

/** Require a valid Bearer access token; attaches req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

/** Require the authenticated user to hold one of the given roles (RBAC). */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}

/**
 * Confirm the session behind this token is still live.
 *
 * An access token is a signed JWT: once issued it stays valid until it expires,
 * whatever happens afterwards. So signing out in one tab, deactivating an
 * account, or a session going idle would otherwise leave a working token in
 * another tab for the rest of its lifetime — long enough to complete a whole
 * form and save it.
 *
 * This costs one indexed query, so it guards the endpoints that change
 * something. Reads stay unchecked and fast.
 */
export async function requireLiveSession(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) return next(new AppError(401, 'Authentication required'));

    const idleCutoff = new Date(Date.now() - env.SESSION_IDLE_MINUTES * 60 * 1000);
    const [user, liveSessions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { status: true },
      }),
      prisma.refreshToken.count({
        where: {
          userId: req.user.sub,
          revoked: false,
          expiresAt: { gt: new Date() },
          lastUsedAt: { gt: idleCutoff },
        },
      }),
    ]);

    if (!user || user.status !== 'ACTIVE') {
      return next(new AppError(401, 'This account is no longer active'));
    }
    // Signing out revokes the session; none left means this token is orphaned.
    if (liveSessions === 0) {
      return next(new AppError(401, 'This session has ended. Please sign in again.'));
    }
    next();
  } catch (err) {
    next(err);
  }
}
