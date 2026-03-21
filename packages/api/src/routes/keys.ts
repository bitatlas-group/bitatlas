import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

const createKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  permissions: z.array(z.enum(['read', 'write', 'delete'])).default(['read', 'write']),
  expiresAt: z.string().datetime().optional(),
});

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  // Generate 32 random bytes = 64 hex chars
  const rawSecret = crypto.randomBytes(32).toString('hex');
  const raw = `ba_${rawSecret}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = `ba_${rawSecret.slice(0, 6)}`;
  return { raw, hash, prefix };
}

// GET /keys
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user!.id, revokedAt: null },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      permissions: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ keys });
});

// POST /keys
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, permissions, expiresAt } = parsed.data;

  // Limit per user
  const existing = await prisma.apiKey.count({
    where: { userId: req.user!.id, revokedAt: null },
  });
  if (existing >= 10) {
    res.status(400).json({ error: 'Maximum of 10 active API keys allowed' });
    return;
  }

  const { raw, hash, prefix } = generateApiKey();

  const key = await prisma.apiKey.create({
    data: {
      userId: req.user!.id,
      keyHash: hash,
      keyPrefix: prefix,
      name,
      permissions,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      permissions: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // Return the raw key only once
  res.status(201).json({ ...key, key: raw });
});

// DELETE /keys/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const key = await prisma.apiKey.findFirst({
    where: { id: req.params.id, userId: req.user!.id, revokedAt: null },
  });

  if (!key) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { revokedAt: new Date() },
  });

  res.json({ ok: true });
});

export default router;
