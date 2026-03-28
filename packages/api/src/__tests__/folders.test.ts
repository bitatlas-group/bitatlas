import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// --- Mocks (hoisted before imports) ---

vi.mock('../middleware/rateLimit', () => ({
  generalRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  uploadRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../db/client', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    file: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    folder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    apiKey: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../services/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
  },
  sessionKey: (userId: string, sessionId: string) => `session:${userId}:${sessionId}`,
  refreshTokenKey: (token: string) => `refresh:${token}`,
  apiKeyRateLimitKey: (keyId: string) => `ratelimit:apikey:${keyId}`,
}));

vi.mock('../services/storage', () => ({
  generateUploadUrl: vi.fn().mockResolvedValue('https://minio.example.com/upload'),
  generateDownloadUrl: vi.fn().mockResolvedValue('https://minio.example.com/download'),
  deleteObject: vi.fn().mockResolvedValue(undefined),
  checkMinioHealth: vi.fn().mockResolvedValue(true),
  ensureBucketExists: vi.fn().mockResolvedValue(undefined),
}));

// --- Imports (after mocks) ---

import { app } from '../app';
import { prisma } from '../db/client';
import { redis } from '../services/redis';
import {
  mockFolder,
  mockFile,
  makeAccessToken,
  TEST_USER_ID,
  sessionPayload,
} from './helpers';

// ── Auth header helper ───────────────────────────
function authHeader() {
  return { Authorization: `Bearer ${makeAccessToken()}` };
}

const FOLDER_ID = mockFolder.id;
const PARENT_FOLDER_ID = 'ba4e0012-3456-7890-abcd-ef1234567890';

// ────────────────────────────────────────────────
// Setup
// ────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(redis.get).mockResolvedValue(sessionPayload());
});

// ────────────────────────────────────────────────
// POST /folders
// ────────────────────────────────────────────────

describe('POST /folders', () => {
  it('creates a root-level folder', async () => {
    vi.mocked(prisma.folder.create).mockResolvedValue(mockFolder as typeof mockFolder);

    const res = await request(app)
      .post('/folders')
      .set(authHeader())
      .send({ name: 'My Documents' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(FOLDER_ID);
    expect(res.body.name).toBe('My Documents');
    expect(res.body.parentId).toBeNull();
  });

  it('creates a nested folder when parentId resolves to a user-owned folder', async () => {
    const parent = { ...mockFolder, id: PARENT_FOLDER_ID, name: 'Parent' };
    const child = { ...mockFolder, name: 'Child', parentId: PARENT_FOLDER_ID };

    vi.mocked(prisma.folder.findFirst).mockResolvedValue(parent as typeof mockFolder);
    vi.mocked(prisma.folder.create).mockResolvedValue(child as typeof mockFolder);

    const res = await request(app)
      .post('/folders')
      .set(authHeader())
      .send({ name: 'Child', parentId: PARENT_FOLDER_ID });

    expect(res.status).toBe(201);
    expect(res.body.parentId).toBe(PARENT_FOLDER_ID);
  });

  it('returns 400 when parentId does not belong to the user', async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post('/folders')
      .set(authHeader())
      .send({ name: 'Orphan', parentId: PARENT_FOLDER_ID });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Parent folder not found');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/folders')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when name is empty string', async () => {
    const res = await request(app)
      .post('/folders')
      .set(authHeader())
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/folders').send({ name: 'x' });
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────
// GET /folders
// ────────────────────────────────────────────────

describe('GET /folders', () => {
  it('returns all folders for the authenticated user', async () => {
    const folderWithChildren = { ...mockFolder, children: [] };
    vi.mocked(prisma.folder.findMany).mockResolvedValue([folderWithChildren] as never);

    const res = await request(app)
      .get('/folders')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.folders).toHaveLength(1);
    expect(res.body.folders[0].id).toBe(FOLDER_ID);
  });

  it('returns an empty list when the user has no folders', async () => {
    vi.mocked(prisma.folder.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get('/folders')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.folders).toEqual([]);
  });

  it('scopes the query to the authenticated user', async () => {
    vi.mocked(prisma.folder.findMany).mockResolvedValue([]);

    await request(app).get('/folders').set(authHeader());

    expect(vi.mocked(prisma.folder.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID },
      }),
    );
  });
});

// ────────────────────────────────────────────────
// GET /folders/:id
// ────────────────────────────────────────────────

describe('GET /folders/:id', () => {
  it('returns the folder with children and non-deleted files', async () => {
    const fileInFolder = {
      id: mockFile.id,
      name: mockFile.name,
      mimeType: mockFile.mimeType,
      sizeBytes: BigInt(1024),
      createdAt: mockFile.createdAt,
    };
    const folderWithData = {
      ...mockFolder,
      children: [{ id: 'child-id', name: 'Child' }],
      files: [fileInFolder],
    };
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(folderWithData as never);

    const res = await request(app)
      .get(`/folders/${FOLDER_ID}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(FOLDER_ID);
    expect(res.body.children).toHaveLength(1);
    expect(res.body.files).toHaveLength(1);
    expect(res.body.files[0].sizeBytes).toBe('1024');
  });

  it('returns 404 when the folder does not exist or belongs to another user', async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .get('/folders/nonexistent-id')
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Folder not found');
  });
});

// ────────────────────────────────────────────────
// PATCH /folders/:id
// ────────────────────────────────────────────────

describe('PATCH /folders/:id', () => {
  beforeEach(() => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolder as typeof mockFolder);
    vi.mocked(prisma.folder.update).mockResolvedValue(mockFolder as typeof mockFolder);
  });

  it('renames a folder', async () => {
    const renamed = { ...mockFolder, name: 'Renamed Folder' };
    vi.mocked(prisma.folder.update).mockResolvedValue(renamed as typeof mockFolder);

    const res = await request(app)
      .patch(`/folders/${FOLDER_ID}`)
      .set(authHeader())
      .send({ name: 'Renamed Folder' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed Folder');
  });

  it('moves a folder to a new parent', async () => {
    const parent = { ...mockFolder, id: PARENT_FOLDER_ID };
    // First call: findFirst for the folder being updated
    // Second call: findFirst for the new parent
    vi.mocked(prisma.folder.findFirst)
      .mockResolvedValueOnce(mockFolder as typeof mockFolder)
      .mockResolvedValueOnce(parent as typeof mockFolder);

    const moved = { ...mockFolder, parentId: PARENT_FOLDER_ID };
    vi.mocked(prisma.folder.update).mockResolvedValue(moved as typeof mockFolder);

    const res = await request(app)
      .patch(`/folders/${FOLDER_ID}`)
      .set(authHeader())
      .send({ parentId: PARENT_FOLDER_ID });

    expect(res.status).toBe(200);
    expect(res.body.parentId).toBe(PARENT_FOLDER_ID);
  });

  it('prevents a folder from being set as its own parent', async () => {
    const res = await request(app)
      .patch(`/folders/${FOLDER_ID}`)
      .set(authHeader())
      .send({ parentId: FOLDER_ID }); // same as the folder being updated

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('A folder cannot be its own parent');
  });

  it('returns 400 when the target parent does not belong to the user', async () => {
    vi.mocked(prisma.folder.findFirst)
      .mockResolvedValueOnce(mockFolder as typeof mockFolder) // existing folder
      .mockResolvedValueOnce(null); // parent not found

    const res = await request(app)
      .patch(`/folders/${FOLDER_ID}`)
      .set(authHeader())
      .send({ parentId: PARENT_FOLDER_ID });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Parent folder not found');
  });

  it('returns 404 when the folder does not exist', async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .patch('/folders/nonexistent')
      .set(authHeader())
      .send({ name: 'New Name' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Folder not found');
  });

  it('returns 400 for an empty name string', async () => {
    const res = await request(app)
      .patch(`/folders/${FOLDER_ID}`)
      .set(authHeader())
      .send({ name: '' });

    expect(res.status).toBe(400);
  });
});

// ────────────────────────────────────────────────
// DELETE /folders/:id
// ────────────────────────────────────────────────

describe('DELETE /folders/:id', () => {
  beforeEach(() => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolder as typeof mockFolder);
    vi.mocked(prisma.file.updateMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.folder.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.folder.delete).mockResolvedValue(mockFolder as typeof mockFolder);
  });

  it('returns ok and deletes the folder', async () => {
    const res = await request(app)
      .delete(`/folders/${FOLDER_ID}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('moves contained files to root before deleting', async () => {
    await request(app).delete(`/folders/${FOLDER_ID}`).set(authHeader());

    expect(vi.mocked(prisma.file.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { folderId: FOLDER_ID, userId: TEST_USER_ID },
        data: { folderId: null },
      }),
    );
  });

  it('moves child folders to root before deleting', async () => {
    await request(app).delete(`/folders/${FOLDER_ID}`).set(authHeader());

    expect(vi.mocked(prisma.folder.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentId: FOLDER_ID, userId: TEST_USER_ID },
        data: { parentId: null },
      }),
    );
  });

  it('calls prisma.folder.delete after cascade operations', async () => {
    await request(app).delete(`/folders/${FOLDER_ID}`).set(authHeader());

    expect(vi.mocked(prisma.folder.delete)).toHaveBeenCalledWith({
      where: { id: FOLDER_ID },
    });
  });

  it('returns 404 when the folder does not exist', async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .delete('/folders/nonexistent')
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Folder not found');
  });
});
