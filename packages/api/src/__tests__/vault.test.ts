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
import { generateUploadUrl, generateDownloadUrl, deleteObject } from '../services/storage';
import {
  mockUser,
  mockFile,
  mockFolder,
  makeAccessToken,
  TEST_USER_ID,
  TEST_EMAIL,
  TEST_SESSION_ID,
  sessionPayload,
} from './helpers';

// ── Auth header helper ───────────────────────────
function authHeader() {
  return { Authorization: `Bearer ${makeAccessToken()}` };
}

/** Minimal valid file creation body */
function validFileBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'secret.txt',
    sizeBytes: 1024,
    storageKey: `user/${TEST_USER_ID}/some-uuid`,
    ownerEncryptedKey: 'base64encryptedkey==',
    ownerIv: 'base64iv==',
    fileIv: 'base64fileiv==',
    authTag: 'base64authtag==',
    ...overrides,
  };
}

// ────────────────────────────────────────────────
// Setup
// ────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(redis.get).mockResolvedValue(sessionPayload());
});

// ────────────────────────────────────────────────
// POST /vault/files/upload-url
// ────────────────────────────────────────────────

describe('POST /vault/files/upload-url', () => {
  it('returns a presigned upload URL and storage key scoped to the user', async () => {
    const res = await request(app)
      .post('/vault/files/upload-url')
      .set(authHeader())
      .send({ fileName: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBe('https://minio.example.com/upload');
    expect(res.body.storageKey).toMatch(new RegExp(`^user/${TEST_USER_ID}/`));
    expect(vi.mocked(generateUploadUrl)).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^user/${TEST_USER_ID}/`)),
      'image/jpeg',
    );
  });

  it('uses octet-stream when contentType is omitted', async () => {
    const res = await request(app)
      .post('/vault/files/upload-url')
      .set(authHeader())
      .send({ fileName: 'data.bin' });

    expect(res.status).toBe(200);
    expect(vi.mocked(generateUploadUrl)).toHaveBeenCalledWith(
      expect.any(String),
      'application/octet-stream',
    );
  });

  it('returns 400 when fileName is missing', async () => {
    const res = await request(app)
      .post('/vault/files/upload-url')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/vault/files/upload-url')
      .send({ fileName: 'x.txt' });

    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────
// POST /vault/files
// ────────────────────────────────────────────────

describe('POST /vault/files', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as typeof mockUser);
    vi.mocked(prisma.file.create).mockResolvedValue(mockFile as typeof mockFile);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as typeof mockUser);
  });

  it('creates a file record and increments storage quota', async () => {
    const res = await request(app)
      .post('/vault/files')
      .set(authHeader())
      .send(validFileBody());

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.sizeBytes).toBe(mockFile.sizeBytes.toString());
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { storageUsedBytes: { increment: 1024 } },
      }),
    );
  });

  it('returns 403 when storageKey is not scoped to the requesting user', async () => {
    const res = await request(app)
      .post('/vault/files')
      .set(authHeader())
      .send(validFileBody({ storageKey: 'user/other-user-id/leaked-key' }));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Invalid storage key');
  });

  it('returns 413 when upload would exceed storage quota', async () => {
    const nearLimitUser = {
      ...mockUser,
      storageUsedBytes: BigInt(1073741824 - 100), // 100 bytes below limit
      storageLimitBytes: BigInt(1073741824),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(nearLimitUser as typeof mockUser);

    const res = await request(app)
      .post('/vault/files')
      .set(authHeader())
      .send(validFileBody({ sizeBytes: 1000 })); // 1000 > 100 remaining

    expect(res.status).toBe(413);
    expect(res.body.error).toBe('Storage quota exceeded');
    expect(res.body.required).toBe(1000);
  });

  it('returns 400 when required encryption fields are missing', async () => {
    const res = await request(app)
      .post('/vault/files')
      .set(authHeader())
      .send({
        name: 'test.txt',
        sizeBytes: 1024,
        storageKey: `user/${TEST_USER_ID}/key`,
        // missing ownerEncryptedKey, ownerIv, fileIv, authTag
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when the specified folderId does not belong to the user', async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post('/vault/files')
      .set(authHeader())
      .send(validFileBody({ folderId: mockFolder.id }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Folder not found');
  });

  it('accepts an optional folderId when the folder exists', async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolder as typeof mockFolder);
    const fileWithFolder = { ...mockFile, folderId: mockFolder.id };
    vi.mocked(prisma.file.create).mockResolvedValue(fileWithFolder as typeof mockFile);

    const res = await request(app)
      .post('/vault/files')
      .set(authHeader())
      .send(validFileBody({ folderId: mockFolder.id }));

    expect(res.status).toBe(201);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/vault/files').send(validFileBody());
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────
// GET /vault/files
// ────────────────────────────────────────────────

describe('GET /vault/files', () => {
  it('returns empty list when user has no files', async () => {
    vi.mocked(prisma.file.findMany).mockResolvedValue([]);
    vi.mocked(prisma.file.count).mockResolvedValue(0);

    const res = await request(app)
      .get('/vault/files')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ files: [], total: 0, limit: 50, offset: 0 });
  });

  it('returns files with BigInt fields serialized as strings', async () => {
    vi.mocked(prisma.file.findMany).mockResolvedValue([mockFile] as typeof mockFile[]);
    vi.mocked(prisma.file.count).mockResolvedValue(1);

    const res = await request(app)
      .get('/vault/files')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.files[0].sizeBytes).toBe('1024');
  });

  it('passes folderId filter to the database query', async () => {
    vi.mocked(prisma.file.findMany).mockResolvedValue([]);
    vi.mocked(prisma.file.count).mockResolvedValue(0);

    await request(app)
      .get(`/vault/files?folderId=${mockFolder.id}`)
      .set(authHeader());

    expect(vi.mocked(prisma.file.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ folderId: mockFolder.id }),
      }),
    );
  });

  it('passes search filter as a case-insensitive contains query', async () => {
    vi.mocked(prisma.file.findMany).mockResolvedValue([]);
    vi.mocked(prisma.file.count).mockResolvedValue(0);

    await request(app)
      .get('/vault/files?search=report')
      .set(authHeader());

    expect(vi.mocked(prisma.file.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: 'report', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('respects limit and offset pagination parameters', async () => {
    vi.mocked(prisma.file.findMany).mockResolvedValue([]);
    vi.mocked(prisma.file.count).mockResolvedValue(0);

    const res = await request(app)
      .get('/vault/files?limit=10&offset=20')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(10);
    expect(res.body.offset).toBe(20);
  });

  it('excludes soft-deleted files by default', async () => {
    vi.mocked(prisma.file.findMany).mockResolvedValue([]);
    vi.mocked(prisma.file.count).mockResolvedValue(0);

    await request(app).get('/vault/files').set(authHeader());

    expect(vi.mocked(prisma.file.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });
});

// ────────────────────────────────────────────────
// GET /vault/files/:id
// ────────────────────────────────────────────────

describe('GET /vault/files/:id', () => {
  it('returns a single file record', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(mockFile as typeof mockFile);

    const res = await request(app)
      .get(`/vault/files/${mockFile.id}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(mockFile.id);
    expect(res.body.sizeBytes).toBe('1024');
  });

  it('returns 404 when file does not exist or belongs to another user', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .get('/vault/files/nonexistent-id')
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('File not found');
  });
});

// ────────────────────────────────────────────────
// GET /vault/files/:id/download-url
// ────────────────────────────────────────────────

describe('GET /vault/files/:id/download-url', () => {
  it('returns download URL with full encryption metadata', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(mockFile as typeof mockFile);

    const res = await request(app)
      .get(`/vault/files/${mockFile.id}/download-url`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toBe('https://minio.example.com/download');
    expect(res.body.encryptionMetadata).toMatchObject({
      ownerEncryptedKey: mockFile.ownerEncryptedKey,
      ownerIv: mockFile.ownerIv,
      fileIv: mockFile.fileIv,
      authTag: mockFile.authTag,
    });
    expect(vi.mocked(generateDownloadUrl)).toHaveBeenCalledWith(mockFile.storageKey);
  });

  it('returns 404 for a non-existent or soft-deleted file', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .get('/vault/files/nonexistent-id/download-url')
      .set(authHeader());

    expect(res.status).toBe(404);
  });
});

// ────────────────────────────────────────────────
// PATCH /vault/files/:id
// ────────────────────────────────────────────────

describe('PATCH /vault/files/:id', () => {
  beforeEach(() => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(mockFile as typeof mockFile);
    vi.mocked(prisma.file.update).mockResolvedValue(mockFile as typeof mockFile);
  });

  it('renames a file', async () => {
    const renamed = { ...mockFile, name: 'renamed.txt' };
    vi.mocked(prisma.file.update).mockResolvedValue(renamed as typeof mockFile);

    const res = await request(app)
      .patch(`/vault/files/${mockFile.id}`)
      .set(authHeader())
      .send({ name: 'renamed.txt' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('renamed.txt');
  });

  it('moves a file to a folder', async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolder as typeof mockFolder);
    const moved = { ...mockFile, folderId: mockFolder.id };
    vi.mocked(prisma.file.update).mockResolvedValue(moved as typeof mockFile);

    const res = await request(app)
      .patch(`/vault/files/${mockFile.id}`)
      .set(authHeader())
      .send({ folderId: mockFolder.id });

    expect(res.status).toBe(200);
    expect(res.body.folderId).toBe(mockFolder.id);
  });

  it('moves a file to root when folderId is null', async () => {
    const moved = { ...mockFile, folderId: null };
    vi.mocked(prisma.file.update).mockResolvedValue(moved as typeof mockFile);

    const res = await request(app)
      .patch(`/vault/files/${mockFile.id}`)
      .set(authHeader())
      .send({ folderId: null });

    expect(res.status).toBe(200);
    expect(res.body.folderId).toBeNull();
  });

  it('returns 400 when target folder does not belong to user', async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .patch(`/vault/files/${mockFile.id}`)
      .set(authHeader())
      .send({ folderId: mockFolder.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Folder not found');
  });

  it('returns 404 when file does not exist', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .patch('/vault/files/nonexistent')
      .set(authHeader())
      .send({ name: 'new.txt' });

    expect(res.status).toBe(404);
  });
});

// ────────────────────────────────────────────────
// DELETE /vault/files/:id
// ────────────────────────────────────────────────

describe('DELETE /vault/files/:id', () => {
  beforeEach(() => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(mockFile as typeof mockFile);
    vi.mocked(prisma.file.update).mockResolvedValue({
      ...mockFile,
      deletedAt: new Date(),
    } as typeof mockFile);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as typeof mockUser);
  });

  it('soft-deletes the file and returns ok', async () => {
    const res = await request(app)
      .delete(`/vault/files/${mockFile.id}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('sets deletedAt on the file record', async () => {
    await request(app)
      .delete(`/vault/files/${mockFile.id}`)
      .set(authHeader());

    expect(vi.mocked(prisma.file.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockFile.id },
        data: { deletedAt: expect.any(Date) },
      }),
    );
  });

  it('decrements user storage usage', async () => {
    await request(app)
      .delete(`/vault/files/${mockFile.id}`)
      .set(authHeader());

    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { storageUsedBytes: { decrement: 1024 } },
      }),
    );
  });

  it('triggers async S3 object deletion', async () => {
    await request(app)
      .delete(`/vault/files/${mockFile.id}`)
      .set(authHeader());

    // deleteObject is called fire-and-forget; give event loop a tick
    await new Promise(r => setTimeout(r, 0));
    expect(vi.mocked(deleteObject)).toHaveBeenCalledWith(mockFile.storageKey);
  });

  it('returns 404 when file does not exist', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .delete('/vault/files/nonexistent')
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('File not found');
  });
});
