import 'dotenv/config';
import { app } from './app';
import { config } from './config';
import { logger } from './services/logger';
import { redis } from './services/redis';
import { ensureBucketExists } from './services/storage';
import { prisma } from './db/client';
import { initX402Middleware } from './middleware/x402Payment';

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

    // Initialize x402 payment middleware
    initX402Middleware();

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
