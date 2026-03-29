import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../db/client';
import { requireAuth, requirePermission } from '../middleware/auth';
import { uploadRateLimit } from '../middleware/rateLimit';
import { generateUploadUrl, generateDownloadUrl, deleteObject } from '../services/storage';

const router = Router();

// All vault routes require auth
router.use(requireAuth);

const VALID_CATEGORIES = ['identity', 'financial', 'legal', 'medical', 'digital'] as const;

const createFileSchema = z.object({
  name: z.string().min(1).max(500),
  mimeType: z.string().max(255).optional().nullable(),
  sizeBytes: z.number().int().positive(),
  originalSizeBytes: z.number().int().positive().optional().nullable(),
  storageKey: z.string().min(1).max(500),
  ownerEncryptedKey: z.string().min(1),
  ownerIv: z.string().min(1),
  fileIv: z.string().min(1),
  authTag: z.string().min(1),
  emergencyEncryptedKey: z.string().optional().nullable(),
  emergencyIv: z.string().optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
  category: z.enum(VALID_CATEGORIES).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
});

const MAX_FILE_SIZE_BYTES = 104857600; // 100 MB

const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(500),
  contentType: z.string().max(255).default('application/octet-stream'),
  maxSizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES).default(MAX_FILE_SIZE_BYTES),
});

const listFilesSchema = z.object({
  folderId: z.string().uuid().optional().nullable(),
  category: z.enum(VALID_CATEGORIES).optional().nullable(),
  search: z.string().max(255).optional().nullable(),
  includeDeleted: z.enum(['true', 'false']).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /vault/files
router.get('/files', requirePermission('read'), async (req: Request, res: Response): Promise<void> => {
  const parsed = listFilesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { folderId, category, search, includeDeleted, limit, offset } = parsed.data;
  const userId = req.user!.id;

  const where = {
    userId,
    ...(folderId !== undefined ? { folderId } : {}),
    ...(category ? { category } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    deletedAt: includeDeleted === 'true' ? undefined : null,
  };

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        originalSizeBytes: true,
        storageKey: true,
        folderId: true,
        category: true,
        tags: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.file.count({ where }),
  ]);

  res.json({
    files: files.map(f => ({
      ...f,
      sizeBytes: f.sizeBytes.toString(),
      originalSizeBytes: f.originalSizeBytes?.toString() ?? null,
    })),
    total,
    limit,
    offset,
  });
});

// GET /vault/files/:id
router.get('/files/:id', requirePermission('read'), async (req: Request, res: Response): Promise<void> => {
  const file = await prisma.file.findFirst({
    where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
  });

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.json({
    ...file,
    sizeBytes: file.sizeBytes.toString(),
    originalSizeBytes: file.originalSizeBytes?.toString() ?? null,
  });
});

// POST /vault/files/upload-url — generate presigned upload URL
router.post('/files/upload-url', uploadRateLimit, requirePermission('write'), async (req: Request, res: Response): Promise<void> => {
  const parsed = uploadUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { contentType } = parsed.data;
  const userId = req.user!.id;

  // Deterministic storage key: user/<userId>/<uuid>
  const storageKey = `user/${userId}/${uuidv4()}`;

  const uploadUrl = await generateUploadUrl(storageKey, contentType);

  res.json({ uploadUrl, storageKey });
});

// GET /vault/files/:id/download-url
router.get('/files/:id/download-url', requirePermission('read'), async (req: Request, res: Response): Promise<void> => {
  const file = await prisma.file.findFirst({
    where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    select: {
      storageKey: true,
      ownerEncryptedKey: true,
      ownerIv: true,
      fileIv: true,
      authTag: true,
      emergencyEncryptedKey: true,
      emergencyIv: true,
    },
  });

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const downloadUrl = await generateDownloadUrl(file.storageKey);

  res.json({
    downloadUrl,
    encryptionMetadata: {
      ownerEncryptedKey: file.ownerEncryptedKey,
      ownerIv: file.ownerIv,
      fileIv: file.fileIv,
      authTag: file.authTag,
      emergencyEncryptedKey: file.emergencyEncryptedKey,
      emergencyIv: file.emergencyIv,
    },
  });
});

// POST /vault/files — register file after upload
router.post('/files', requirePermission('write'), async (req: Request, res: Response): Promise<void> => {
  const parsed = createFileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = req.user!.id;
  const data = parsed.data;

  // Verify storage key belongs to this user
  if (!data.storageKey.startsWith(`user/${userId}/`)) {
    res.status(403).json({ error: 'Invalid storage key' });
    return;
  }

  // Enforce per-file size limit (100 MB)
  if (data.sizeBytes > MAX_FILE_SIZE_BYTES) {
    res.status(413).json({ error: 'File exceeds maximum allowed size of 100 MB', maxSizeBytes: MAX_FILE_SIZE_BYTES });
    return;
  }

  // Enforce storage quota
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storageUsedBytes: true, storageLimitBytes: true },
  });
  if (user) {
    const used = Number(user.storageUsedBytes);
    const limit = Number(user.storageLimitBytes);
    if (used + data.sizeBytes > limit) {
      res.status(413).json({
        error: 'Storage quota exceeded',
        used,
        limit,
        required: data.sizeBytes,
      });
      return;
    }
  }

  // Verify folder belongs to user if provided
  if (data.folderId) {
    const folder = await prisma.folder.findFirst({ where: { id: data.folderId, userId } });
    if (!folder) {
      res.status(400).json({ error: 'Folder not found' });
      return;
    }
  }

  const file = await prisma.file.create({
    data: {
      userId,
      name: data.name,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      originalSizeBytes: data.originalSizeBytes,
      storageKey: data.storageKey,
      ownerEncryptedKey: data.ownerEncryptedKey,
      ownerIv: data.ownerIv,
      fileIv: data.fileIv,
      authTag: data.authTag,
      emergencyEncryptedKey: data.emergencyEncryptedKey,
      emergencyIv: data.emergencyIv,
      folderId: data.folderId,
      category: data.category,
      tags: data.tags ?? [],
    },
  });

  // Update user storage usage
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsedBytes: { increment: data.sizeBytes } },
  });

  res.status(201).json({
    ...file,
    sizeBytes: file.sizeBytes.toString(),
    originalSizeBytes: file.originalSizeBytes?.toString() ?? null,
  });
});

// PATCH /vault/files/:id — update file (move to folder, rename)
const updateFileSchema = z.object({
  folderId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(500).optional(),
});

router.patch('/files/:id', requirePermission('write'), async (req: Request, res: Response): Promise<void> => {
  const parsed = updateFileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = req.user!.id;
  const { folderId, name } = parsed.data;

  const file = await prisma.file.findFirst({
    where: { id: req.params.id, userId, deletedAt: null },
    select: { id: true },
  });

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Verify target folder belongs to user (if moving)
  if (folderId !== undefined && folderId !== null) {
    const folder = await prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folder) {
      res.status(400).json({ error: 'Folder not found' });
      return;
    }
  }

  const updated = await prisma.file.update({
    where: { id: file.id },
    data: {
      ...(folderId !== undefined ? { folderId } : {}),
      ...(name !== undefined ? { name } : {}),
    },
  });

  res.json({
    ...updated,
    sizeBytes: updated.sizeBytes.toString(),
    originalSizeBytes: updated.originalSizeBytes?.toString() ?? null,
  });
});

// DELETE /vault/files/:id — soft delete + S3 cleanup + quota update
router.delete('/files/:id', requirePermission('delete'), async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const file = await prisma.file.findFirst({
    where: { id: req.params.id, userId, deletedAt: null },
    select: { id: true, sizeBytes: true, storageKey: true },
  });

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Soft delete in DB
  await prisma.file.update({
    where: { id: file.id },
    data: { deletedAt: new Date() },
  });

  // Decrement storage usage
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsedBytes: { decrement: Number(file.sizeBytes) } },
  });

  // Delete from S3 (async, don't block response)
  deleteObject(file.storageKey).catch((err) => {
    console.error(`[S3] Failed to delete ${file.storageKey}:`, err.message);
  });

  res.json({ ok: true });
});

export default router;
