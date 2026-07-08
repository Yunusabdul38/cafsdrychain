import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env, corsOrigins } from './env.js';
import { logger } from './lib/logger.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { ensureWalletCounter } from './services/walletService.js';
import { chainEnabled } from './chain/client.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import batchRoutes from './routes/batches.js';
import verifyRoutes from './routes/verify.js';
import locationRoutes from './routes/locations.js';

const app = express();

// Behind a proxy (Render/Fly/NGINX) so rate-limit & secure cookies see real IPs.
app.set('trust proxy', 1);

// --- Security middleware -------------------------------------------------
app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / server-to-server (no origin) and the allowlist.
      if (!origin || corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' })); // bound body size
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use(globalLimiter);

// --- Routes --------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', chain: chainEnabled() ? 'enabled' : 'off', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/locations', locationRoutes);


app.use(notFound);
app.use(errorHandler);

async function start() {
  await ensureWalletCounter();
  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`On-chain integration: ${chainEnabled() ? 'ENABLED' : 'disabled'}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
