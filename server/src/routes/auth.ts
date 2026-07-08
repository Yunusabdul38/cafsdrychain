import { Router } from 'express';
import type { CookieOptions } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
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
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.login(email, password);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ accessToken, user });
  })
);

router.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    if (!token) throw new AppError(401, 'No session');
    const { accessToken, refreshToken } = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ accessToken });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
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
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ ok: true });
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
