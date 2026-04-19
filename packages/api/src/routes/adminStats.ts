import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';

const router = Router();

function requireStatsToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.STATS_TOKEN;
  if (!expected) {
    res.status(503).json({ error: 'STATS_TOKEN not set' });
    return;
  }
  const header = req.header('authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (provided !== expected) {
    res.status(401).json({ error: 'Invalid stats token' });
    return;
  }
  next();
}

router.get('/', requireStatsToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      signupsToday,
      signupsWeek,
      totalFiles,
      totalFolders,
      totalApiKeys,
      agentSessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.file.count(),
      prisma.folder.count(),
      prisma.apiKey.count(),
      prisma.agentSession.count(),
    ]);

    res.json({
      product: 'bitatlas',
      generatedAt: now.toISOString(),
      users: {
        total: totalUsers,
        signups24h: signupsToday,
        signups7d: signupsWeek,
      },
      files: totalFiles,
      folders: totalFolders,
      apiKeys: totalApiKeys,
      agentSessions,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
