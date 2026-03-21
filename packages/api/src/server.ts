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

async function start() {
  try {
    // Connect Redis
    await redis.connect();
    console.log('[Redis] Connected');

    // Ensure MinIO bucket exists
    await ensureBucketExists();
    console.log('[MinIO] Ready');

    // Verify DB connection
    await prisma.$connect();
    console.log('[DB] Connected');

    app.listen(config.PORT, () => {
      console.log(`[API] BitAtlas API running on port ${config.PORT} (${config.NODE_ENV})`);
    });
  } catch (err) {
    console.error('[Startup] Fatal error:', err);
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
