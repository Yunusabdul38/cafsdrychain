import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32).default('default-jwt-access-secret-minimum-32-chars-long-cafsdrychain'),
  JWT_REFRESH_SECRET: z.string().min(32).default('default-jwt-refresh-secret-minimum-32-chars-long-cafsdrychain'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  /// A session idle longer than this is refused on its next refresh, even
  /// though the refresh token itself has not expired.
  SESSION_IDLE_MINUTES: z.coerce.number().positive().default(60),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Wallet / chain.
  // MASTER_XPUB     → watch-only address derivation (safe for the API server).
  // MASTER_MNEMONIC → full seed; required only to SIGN (signer service; KMS/HSM).
  MASTER_XPUB: z.string().min(1).optional(),
  MASTER_MNEMONIC: z.string().min(1).optional(),
  COIN_TYPE: z.coerce.number().default(60), // BIP-44 coin type (60 = EVM/Base)
  WALLET_CHAIN: z.string().default('base'),

  // On-chain integration (optional — app works off-chain until these are set)
  CHAIN_ENABLED: z
    .union([z.string(), z.boolean()])
    .default('false')
    .transform((v) => String(v) === 'true'),
  RPC_URL: z.string().optional(),
  CHAIN_ID: z.coerce.number().default(84532),
  ROLE_MANAGER_ADDRESS: z.string().optional(),
  BATCH_REGISTRY_ADDRESS: z.string().optional(),
  FORWARDER_ADDRESS: z.string().optional(),
  RELAYER_PRIVATE_KEY: z.string().optional(), // master wallet that pays gas + is admin

  // Payments — 'stub' issues a self-serve test link; swap for a real gateway.
  PAYMENT_PROVIDER: z.enum(['stub', 'paystack', 'flutterwave']).default('stub'),

  // The primary administrator. Seeded on boot, and protected from being
  // deactivated or deleted so the system always has one way back in.
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  /// Where the public contact form delivers. Logged instead when unset.
  CONTACT_EMAIL: z.string().email().optional(),
  /// Relayer balance (in ETH) below which admins are warned to top up.
  RELAYER_LOW_BALANCE: z.coerce.number().positive().default(0.01),
  APP_URL: z.string().default('http://localhost:3000'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a clear message — never boot with a broken/insecure config.
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim());

// APP_URL and CORS_ORIGINS both fall back to localhost, which is right for dev
// but silently breaks a deployment: password-reset and invite emails would be
// built with a localhost link that no recipient can open. Say so loudly at boot
// rather than letting it fail invisibly at send time.
if (env.NODE_ENV === 'production') {
  const localhost = /localhost|127\.0\.0\.1/;
  if (localhost.test(env.APP_URL)) {
    console.error(
      `MISCONFIGURED: APP_URL is "${env.APP_URL}" in production. Password-reset ` +
        'and invite emails will contain unreachable localhost links. Set APP_URL ' +
        'to the public frontend URL (e.g. https://your-app.vercel.app).'
    );
  }
  if (corsOrigins.some((o) => localhost.test(o))) {
    console.error(
      `MISCONFIGURED: CORS_ORIGINS is "${env.CORS_ORIGINS}" in production. Set it ` +
        'to the public frontend origin(s).'
    );
  }
}
