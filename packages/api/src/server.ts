import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config, corsOrigins } from './config';
import { generalRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { logger } from './services/logger';
import { redis } from './services/redis';
import { ensureBucketExists } from './services/storage';
import { prisma } from './db/client';

import authRoutes from './routes/auth';
import vaultRoutes from './routes/vault';
import folderRoutes from './routes/folders';
import keyRoutes from './routes/keys';
import statusRoutes from './routes/status';

const app = express();

// Request logging (high priority)
app.use(requestLogger);

// Trust the first proxy (Nginx) so express-rate-limit can read X-Forwarded-For
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global rate limit
app.use(generalRateLimit);

// Routes
app.use('/status', statusRoutes);
app.use('/auth', authRoutes);
app.use('/vault', vaultRoutes);
app.use('/folders', folderRoutes);
app.use('/keys', keyRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

async function retryConnect(
  name: string,
  fn: () => Promise<void>,
  maxRetries = 5,
  delayMs = 3000,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fn();
      return;
    } catch (err) {
      logger.warn({ attempt, maxRetries, name, err: (err as Error).message }, `[${name}] Connection attempt failed`);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
}

async function start() {
  try {
    // Connect Redis (with retries — may start before Redis is fully ready)
    await retryConnect('Redis', async () => {
      await redis.connect();
      logger.info('[Redis] Connected');
    });

    // Ensure MinIO bucket exists (with retries — MinIO health check can pass before API is ready)
    await retryConnect('MinIO', async () => {
      await ensureBucketExists();
      logger.info('[MinIO] Ready');
    });

    // Verify DB connection (with retries)
    await retryConnect('DB', async () => {
      await prisma.$connect();
      logger.info('[DB] Connected');
    });

    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT, env: config.NODE_ENV }, `[API] BitAtlas API running`);
    });
  } catch (err) {
    logger.fatal({ err }, '[Startup] Fatal error after retries');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Shutdown] SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[Shutdown] SIGINT received');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

start();
