import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { httpLogger } from './lib/httpLogger.js';
import { env, corsOrigins } from './env.js';
import { logger } from './lib/logger.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { ensureWalletCounter } from './services/walletService.js';
import { chainEnabled, checkRpc } from './chain/client.js';
import { explorerUrl } from './chain/explorer.js';
import { startChainSweeper } from './chain/sweeper.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import batchRoutes from './routes/batches.js';
import verifyRoutes from './routes/verify.js';
import locationRoutes from './routes/locations.js';
import paymentRoutes, { batchPaymentRoutes } from './routes/payments.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Behind a proxy (Render/Fly/NGINX) so rate-limit & secure cookies see real IPs.
app.set('trust proxy', 1);

// --- Security middleware -------------------------------------------------
app.use(helmet());
const allowedOrigins = new Set(corsOrigins);
corsOrigins.forEach((url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith('www.')) {
      allowedOrigins.add(`${parsed.protocol}//${parsed.hostname.slice(4)}`);
    } else {
      allowedOrigins.add(`${parsed.protocol}//www.${parsed.hostname}`);
    }
  } catch {}
});

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.has(origin) || origin.endsWith('.vercel.app')) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
  })
);
app.use(httpLogger);
// Webhooks are mounted before the JSON parser: signature verification needs the
// exact bytes the gateway sent, which a parse-and-reserialise round trip loses.
app.use('/api/payments', paymentRoutes);

app.use(express.json({ limit: '100kb' })); // bound body size
app.use(cookieParser());
app.use(globalLimiter);

// --- Routes --------------------------------------------------------------
// Public deployment settings the site reads at runtime (see client/lib/config.ts).
app.get('/api/config', (_req, res) => {
  res.json({ chainId: env.CHAIN_ID, explorerUrl, hideMoisture: env.HIDE_MOISTURE });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', chain: chainEnabled() ? 'enabled' : 'off', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/batches', batchPaymentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  const port = Number(process.env.PORT) || env.PORT;
  app.listen(port, '0.0.0.0', () => {
    logger.info(`Server running on port ${port} (${env.NODE_ENV})`);
    logger.info(`On-chain integration: ${chainEnabled() ? 'ENABLED' : 'disabled'}`);
  });

  try {
    await ensureWalletCounter();
    logger.info('Wallet counter initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize wallet counter — DB schema may need pushing');
  }

  await checkRpc();
  // Catches up any batch whose chain write failed and nothing has retried.
  startChainSweeper();
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
