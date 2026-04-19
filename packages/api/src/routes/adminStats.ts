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

async function fetchGscData(): Promise<Record<string, unknown>> {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  const siteUrl = process.env.GSC_SITE_URL || 'sc-domain:bitatlas.com';
  if (!raw) return { error: 'GSC_SERVICE_ACCOUNT_JSON not set' };
  try {
    const { google } = await import('googleapis');
    const credentials = JSON.parse(raw);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() - 3);
    const start = new Date(today);
    start.setDate(start.getDate() - 10);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const totals = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: fmt(start), endDate: fmt(end), dimensions: ['device'] },
    });
    const byQuery = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: fmt(start), endDate: fmt(end), dimensions: ['query'], rowLimit: 10 },
    });

    let clicks = 0;
    let impressions = 0;
    for (const row of totals.data.rows || []) {
      clicks += row.clicks || 0;
      impressions += row.impressions || 0;
    }
    const topQueries = (byQuery.data.rows || []).map((r) => ({
      query: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
    }));
    return {
      site: siteUrl,
      window: { start: fmt(start), end: fmt(end) },
      clicks,
      impressions,
      topQueries,
    };
  } catch (err) {
    console.error('GSC fetch failed:', err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
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
      gsc,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.file.count(),
      prisma.folder.count(),
      prisma.apiKey.count(),
      prisma.agentSession.count(),
      fetchGscData(),
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
      gsc,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
