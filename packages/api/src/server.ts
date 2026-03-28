import 'dotenv/config';
import { app } from './app';
import { config } from './config';
import { redis } from './services/redis';
import { ensureBucketExists } from './services/storage';
import { prisma } from './db/client';

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
