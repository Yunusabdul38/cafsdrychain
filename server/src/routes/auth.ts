import { Router } from 'express';
import type { CookieOptions } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireLiveSession } from '../middleware/auth.js';
import { authLimiter, loginLimiter, sessionLimiter } from '../middleware/rateLimit.js';
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  acceptInviteSchema,
} from '../schemas/index.js';
import * as authService from '../services/authService.js';
import { env } from '../env.js';
import { AppError } from '../middleware/error.js';

const router = Router();

const REFRESH_COOKIE = 'drychain_rt';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    // The existing cookie decides whether someone else already holds this browser.
    const existing = req.cookies?.[REFRESH_COOKIE];
    const { accessToken, refreshToken, user } = await authService.login(
      email,
      password,
      typeof existing === 'string' ? existing : undefined
    );
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ accessToken, user });
  })
);

router.post(
  '/refresh',
  sessionLimiter,
  asyncHandler(async (req, res) => {
    const cookieToken = req.cookies?.[REFRESH_COOKIE];
    const bodyToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
    const token = (typeof cookieToken === 'string' ? cookieToken : undefined) ?? bodyToken;
    if (!token) throw new AppError(401, 'No session');
    const { accessToken, refreshToken, user } = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    // The user is returned so a client can detect the session changing identity
    // underneath it and refuse to carry on as somebody else.
    res.json({ accessToken, user });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const cookieToken = req.cookies?.[REFRESH_COOKIE];
    const bodyToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
    const token = (typeof cookieToken === 'string' ? cookieToken : undefined) ?? bodyToken;
    if (token) await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
    res.json({ ok: true });
  })
);

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(async (req, res) => {
    await authService.requestPasswordReset(req.body.email);
    // Always the same response — never reveal whether the email exists.
    res.json({ ok: true });
  })
);

router.post(
  '/accept-invite',
  authLimiter,
  validate({ body: acceptInviteSchema }),
  asyncHandler(async (req, res) => {
    await authService.acceptInvite(req.body.token, req.body.password);
    res.json({ ok: true });
  })
);

router.get(
  '/verify-invite-token',
  asyncHandler(async (req, res) => {
    const token = req.query.token as string;
    if (!token) return res.json({ valid: false, reason: 'missing' });
    res.json(await authService.verifyResetToken(token, 'INVITE'));
  })
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ ok: true });
  })
);

router.get(
  '/verify-reset-token',
  asyncHandler(async (req, res) => {
    const token = req.query.token as string;
    if (!token) return res.json({ valid: false, reason: 'missing' });
    const result = await authService.verifyResetToken(token);
    res.json(result);
  })
);

/**
 * Cheap liveness probe the UI polls, so a session that ended elsewhere is
 * noticed within a minute rather than when a filled-in form is submitted.
 */
router.get(
  '/heartbeat',
  requireAuth,
  requireLiveSession,
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  })
);

/** Who holds this browser, if anyone. Used to steer sign-in. */
router.get(
  '/session',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    const user = await authService.currentSessionUser(
      typeof token === 'string' ? token : undefined
    );
    res.json({ user });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await authService.me(req.user!.sub) });
  })
);

router.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await authService.changePassword(
      req.user!.sub,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.json({ ok: true });
  })
);

export default router;
