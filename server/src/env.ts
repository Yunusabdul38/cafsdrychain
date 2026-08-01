import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),

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

  // Email
  RESEND_API_KEY: z.string().optional(),
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
