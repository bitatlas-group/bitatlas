import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

// GET /folders
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const folders = await prisma.folder.findMany({
    where: { userId: req.user!.id },
    include: { children: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  res.json({ folders });
});

// GET /folders/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const folder = await prisma.folder.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: {
      children: { select: { id: true, name: true } },
      files: {
        where: { deletedAt: null },
        select: { id: true, name: true, mimeType: true, sizeBytes: true, createdAt: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!folder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  res.json({
    ...folder,
    files: folder.files.map(f => ({
      ...f,
      sizeBytes: f.sizeBytes.toString(),
    })),
  });
});

// POST /folders
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createFolderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, parentId } = parsed.data;
  const userId = req.user!.id;

  if (parentId) {
    const parent = await prisma.folder.findFirst({ where: { id: parentId, userId } });
    if (!parent) {
      res.status(400).json({ error: 'Parent folder not found' });
      return;
    }
  }

  const folder = await prisma.folder.create({
    data: { userId, name, parentId },
  });

  res.status(201).json(folder);
});

// PATCH /folders/:id
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const parsed = updateFolderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = req.user!.id;
  const existing = await prisma.folder.findFirst({ where: { id: req.params.id, userId } });

  if (!existing) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const { name, parentId } = parsed.data;

  if (parentId && parentId === req.params.id) {
    res.status(400).json({ error: 'A folder cannot be its own parent' });
    return;
  }

  if (parentId) {
    const parent = await prisma.folder.findFirst({ where: { id: parentId, userId } });
    if (!parent) {
      res.status(400).json({ error: 'Parent folder not found' });
      return;
    }
  }

  const updated = await prisma.folder.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
    },
  });

  res.json(updated);
});

// DELETE /folders/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const folder = await prisma.folder.findFirst({ where: { id: req.params.id, userId } });

  if (!folder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  // Move files in this folder to root (null folderId) before deleting
  await prisma.file.updateMany({
    where: { folderId: req.params.id, userId },
    data: { folderId: null },
  });

  // Move child folders to root
  await prisma.folder.updateMany({
    where: { parentId: req.params.id, userId },
    data: { parentId: null },
  });

  await prisma.folder.delete({ where: { id: req.params.id } });

  res.json({ ok: true });
});

export default router;
