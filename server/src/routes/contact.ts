import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { contactSchema } from '../schemas/index.js';
import { sendContactMessage } from '../lib/email.js';

const router = Router();

/**
 * Public enquiry form on the marketing site. Rate-limited with the strict
 * auth limiter, since it is unauthenticated and sends mail.
 */
router.post(
  '/',
  authLimiter,
  validate({ body: contactSchema }),
  asyncHandler(async (req, res) => {
    await sendContactMessage(req.body);
    res.json({ ok: true });
  })
);

export default router;
