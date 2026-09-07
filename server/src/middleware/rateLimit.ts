import rateLimit from 'express-rate-limit';

// Global limiter — blunt protection against abuse / DoS.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for password-reset and invitation endpoints. These send mail,
// so the cost of abuse is real even though no credential is being guessed.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

/**
 * Sign-in attempts.
 *
 * Counted per account rather than per address: a hub shares one internet
 * connection, so an IP-only limit means one operator mistyping their password
 * locks out everyone standing next to them. Successful sign-ins do not count,
 * so only genuine failures consume the budget.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String((req.body as { email?: unknown })?.email ?? '').toLowerCase();
    return `${req.ip ?? 'unknown'}|${email}`;
  },
  // The key is scoped by account, not raw IP, so the built-in IP check does not apply.
  validate: { ip: false },
  message: {
    error:
      'Too many sign-in attempts for this account. Please wait a few minutes and try again.',
  },
});

/**
 * Session upkeep: refreshing a token and signing out.
 *
 * These present an existing token rather than a guessable secret, and every
 * open tab performs them on a timer, so they need far more headroom than a
 * sign-in. Sharing the sign-in budget was locking people out of logging in.
 */
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again shortly' },
});

// Public verification endpoint — generous but bounded.
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
