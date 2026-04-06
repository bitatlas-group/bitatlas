import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { redis } from '../services/redis';
import { checkMinioHealth } from '../services/storage';
import { cleanupExpiredFiles } from '../services/expiry';
import { x402Config, x402Routes } from '../config/x402';

const router = Router();

// GET /status
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const [dbOk, redisOk, minioOk] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redis.ping().then(r => r === 'PONG').catch(() => false),
    checkMinioHealth(),
  ]);

  const healthy = dbOk && redisOk && minioOk;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks: {
      database: dbOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
      storage: minioOk ? 'ok' : 'error',
    },
    x402: {
      enabled: x402Config.enabled,
      network: x402Config.enabled ? x402Config.network : undefined,
      payTo: x402Config.enabled ? x402Config.payTo : undefined,
      routes: x402Config.enabled ? Object.keys(x402Routes) : [],
    },
    timestamp: new Date().toISOString(),
  });
});

// POST /status/cleanup — manually trigger expired file cleanup
// Protected by a simple shared secret to prevent abuse
router.post('/cleanup', async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-cleanup-secret'];
  if (!secret || secret !== process.env.CLEANUP_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const result = await cleanupExpiredFiles();
  res.json({ ok: true, ...result });
});

export default router;
