import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { Role } from '@prisma/client';
import { env } from '../env.js';
import { AppError } from '../middleware/error.js';

export type AccessPayload = {
  sub: string; // user id
  role: Role;
  email: string;
};

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as AccessPayload;
}

/**
 * Refresh tokens are opaque random strings. Only their SHA-256 hash is stored,
 * so a database leak can't be used to mint sessions. Tokens are rotated on use.
 */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString('base64url');
  const hash = hashRefreshToken(token);
  return { token, hash };
}

export function hashRefreshToken(token: string): string {
  if (!token || typeof token !== 'string') {
    throw new AppError(401, 'Invalid session token');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
