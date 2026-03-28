import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config, corsOrigins } from './config';
import { generalRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { redis } from './services/redis';
import { ensureBucketExists } from './services/storage';
import { prisma } from './db/client';

import authRoutes from './routes/auth';
import vaultRoutes from './routes/vault';
import folderRoutes from './routes/folders';
import keyRoutes from './routes/keys';
import statusRoutes from './routes/status';

const app = express();

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
      console.warn(`[${name}] Connection attempt ${attempt}/${maxRetries} failed:`, (err as Error).message);
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
      console.log('[Redis] Connected');
    });

    // Ensure MinIO bucket exists (with retries — MinIO health check can pass before API is ready)
    await retryConnect('MinIO', async () => {
      await ensureBucketExists();
      console.log('[MinIO] Ready');
    });

    // Verify DB connection (with retries)
    await retryConnect('DB', async () => {
      await prisma.$connect();
      console.log('[DB] Connected');
    });

    app.listen(config.PORT, () => {
      console.log(`[API] BitAtlas API running on port ${config.PORT} (${config.NODE_ENV})`);
    });
  } catch (err) {
    console.error('[Startup] Fatal error after retries:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Shutdown] SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

start();
