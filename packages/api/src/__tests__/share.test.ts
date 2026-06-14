import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// --- Mocks (hoisted before imports) ---

vi.mock('../middleware/rateLimit', () => ({
  generalRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  uploadRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  shareResolveRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Default: not an x402 request. Individual tests can flip isX402Paid.
vi.mock('../middleware/x402Auth', () => ({
  isX402Paid: vi.fn(() => false),
  x402AnonymousContext: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../db/client', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    user: { findUnique: vi.fn() },
    file: { findFirst: vi.fn() },
    share: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../services/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
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
import { isX402Paid } from '../middleware/x402Auth';
import { mockFile, makeAccessToken, TEST_USER_ID, sessionPayload } from './helpers';

function authHeader() {
  return { Authorization: `Bearer ${makeAccessToken()}` };
}

const SHARE_ID = 'AbC123dEfGhIjKlMnOpQrS'; // 22-char base64url

function makeShare(overrides: Record<string, unknown> = {}) {
  return {
    id: SHARE_ID,
    fileId: mockFile.id,
    createdBy: TEST_USER_ID,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxDownloads: null as number | null,
    downloadCount: 0,
    revokedAt: null as Date | null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    file: {
      name: 'secret.txt',
      mimeType: 'text/plain',
      sizeBytes: BigInt(1024),
      originalSizeBytes: null as bigint | null,
      storageKey: `user/${TEST_USER_ID}/uuid-key`,
      fileIv: 'base64fileiv==',
      authTag: 'base64authtag==',
      deletedAt: null as Date | null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(redis.get).mockResolvedValue(sessionPayload());
  vi.mocked(redis.incr).mockResolvedValue(1);
  vi.mocked(redis.expire).mockResolvedValue(1);
  vi.mocked(isX402Paid).mockReturnValue(false);
  // Owner plan lookup (resolve egress + create limits) defaults to free.
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ plan: 'free' } as never);
});

// ────────────────────────────────────────────────
// POST /vault/files/:id/share — create
// ────────────────────────────────────────────────

describe('POST /vault/files/:id/share', () => {
  const smallFile = { id: mockFile.id, sizeBytes: BigInt(1024), originalSizeBytes: BigInt(1024) };

  it('creates a share and returns shareId + expiresAt, never a key or URL', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(smallFile as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ plan: 'free' } as never);
    vi.mocked(prisma.share.count).mockResolvedValue(0);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    vi.mocked(prisma.share.create).mockResolvedValue({ id: SHARE_ID, expiresAt } as never);

    const res = await request(app)
      .post(`/vault/files/${mockFile.id}/share`)
      .set(authHeader())
      .send({ expiresIn: '7d' });

    expect(res.status).toBe(201);
    expect(res.body.shareId).toBe(SHARE_ID);
    expect(res.body.expiresAt).toBeDefined();
    // The server response must never contain key material or an assembled URL.
    expect(JSON.stringify(res.body)).not.toMatch(/#k=|http/);
  });

  it('applies the free-plan default download cap (100) when none is given', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(smallFile as never);
    vi.mocked(prisma.share.count).mockResolvedValue(0);
    vi.mocked(prisma.share.create).mockResolvedValue({ id: SHARE_ID, expiresAt: new Date() } as never);

    await request(app).post(`/vault/files/${mockFile.id}/share`).set(authHeader()).send({});

    expect(prisma.share.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ maxDownloads: 100 }) }),
    );
  });

  it('clamps an over-limit download cap down to the free-plan ceiling (100)', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(smallFile as never);
    vi.mocked(prisma.share.count).mockResolvedValue(0);
    vi.mocked(prisma.share.create).mockResolvedValue({ id: SHARE_ID, expiresAt: new Date() } as never);

    await request(app).post(`/vault/files/${mockFile.id}/share`).set(authHeader()).send({ maxDownloads: 5000 });

    expect(prisma.share.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ maxDownloads: 100 }) }),
    );
  });

  it('rejects expiry beyond the free-plan max (30d → 403)', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(smallFile as never);

    const res = await request(app)
      .post(`/vault/files/${mockFile.id}/share`)
      .set(authHeader())
      .send({ expiresIn: '30d' });

    expect(res.status).toBe(403);
    expect(prisma.share.create).not.toHaveBeenCalled();
  });

  it('rejects a file larger than the free-plan shareable size (403)', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(
      { id: mockFile.id, sizeBytes: BigInt(30 * 1024 * 1024), originalSizeBytes: BigInt(30 * 1024 * 1024) } as never,
    );

    const res = await request(app)
      .post(`/vault/files/${mockFile.id}/share`)
      .set(authHeader())
      .send({ expiresIn: '7d' });

    expect(res.status).toBe(403);
    expect(prisma.share.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the file is not owned by the caller', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post(`/vault/files/${mockFile.id}/share`)
      .set(authHeader())
      .send({});

    expect(res.status).toBe(404);
  });

  it('returns 403 when a free-plan user is at the active-share cap', async () => {
    vi.mocked(prisma.file.findFirst).mockResolvedValue({ id: mockFile.id } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ plan: 'free' } as never);
    vi.mocked(prisma.share.count).mockResolvedValue(10);

    const res = await request(app)
      .post(`/vault/files/${mockFile.id}/share`)
      .set(authHeader())
      .send({});

    expect(res.status).toBe(403);
    expect(prisma.share.create).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid expiresIn', async () => {
    const res = await request(app)
      .post(`/vault/files/${mockFile.id}/share`)
      .set(authHeader())
      .send({ expiresIn: '1y' });

    expect(res.status).toBe(400);
  });

  it('rejects anonymous x402 callers', async () => {
    vi.mocked(isX402Paid).mockReturnValue(true);

    const res = await request(app)
      .post(`/vault/files/${mockFile.id}/share`)
      .set(authHeader())
      .send({});

    expect(res.status).toBe(403);
    expect(prisma.share.create).not.toHaveBeenCalled();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post(`/vault/files/${mockFile.id}/share`).send({});
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────
// GET /share/:shareId — public resolve
// ────────────────────────────────────────────────

describe('GET /share/:shareId', () => {
  it('resolves a live share with ciphertext coordinates and a presigned URL', async () => {
    vi.mocked(prisma.share.findUnique).mockResolvedValue(makeShare() as never);
    vi.mocked(prisma.share.updateMany).mockResolvedValue({ count: 1 } as never);

    const res = await request(app).get(`/share/${SHARE_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('secret.txt');
    expect(res.body.fileIv).toBe('base64fileiv==');
    expect(res.body.authTag).toBe('base64authtag==');
    expect(res.body.downloadUrl).toBe('https://minio.example.com/download');
    expect(res.body.sizeBytes).toBe('1024');
    // Atomic claim must have run.
    expect(prisma.share.updateMany).toHaveBeenCalledOnce();
    // No key material is ever returned.
    expect(JSON.stringify(res.body)).not.toMatch(/ownerEncryptedKey|#k=/);
  });

  it('returns 404 for an unknown share id', async () => {
    vi.mocked(prisma.share.findUnique).mockResolvedValue(null);
    const res = await request(app).get(`/share/${SHARE_ID}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when the underlying file was deleted', async () => {
    vi.mocked(prisma.share.findUnique).mockResolvedValue(
      makeShare({ file: { ...makeShare().file, deletedAt: new Date() } }) as never,
    );
    const res = await request(app).get(`/share/${SHARE_ID}`);
    expect(res.status).toBe(404);
  });

  it('returns 410 for an expired share', async () => {
    vi.mocked(prisma.share.findUnique).mockResolvedValue(
      makeShare({ expiresAt: new Date(Date.now() - 1000) }) as never,
    );
    const res = await request(app).get(`/share/${SHARE_ID}`);
    expect(res.status).toBe(410);
    expect(prisma.share.updateMany).not.toHaveBeenCalled();
  });

  it('returns 410 for a revoked share', async () => {
    vi.mocked(prisma.share.findUnique).mockResolvedValue(
      makeShare({ revokedAt: new Date() }) as never,
    );
    const res = await request(app).get(`/share/${SHARE_ID}`);
    expect(res.status).toBe(410);
  });

  it('returns 410 when the download cap is reached', async () => {
    vi.mocked(prisma.share.findUnique).mockResolvedValue(
      makeShare({ maxDownloads: 3, downloadCount: 3 }) as never,
    );
    const res = await request(app).get(`/share/${SHARE_ID}`);
    expect(res.status).toBe(410);
  });

  it('returns 410 when the atomic claim loses a race (count 0)', async () => {
    vi.mocked(prisma.share.findUnique).mockResolvedValue(
      makeShare({ maxDownloads: 3, downloadCount: 2 }) as never,
    );
    vi.mocked(prisma.share.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app).get(`/share/${SHARE_ID}`);
    expect(res.status).toBe(410);
  });

  it('reports downloadsRemaining when a cap is set', async () => {
    vi.mocked(prisma.share.findUnique).mockResolvedValue(
      makeShare({ maxDownloads: 5, downloadCount: 1 }) as never,
    );
    vi.mocked(prisma.share.updateMany).mockResolvedValue({ count: 1 } as never);

    const res = await request(app).get(`/share/${SHARE_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.downloadsRemaining).toBe(3); // 5 - (1 + 1)
  });

  it('returns 429 when the owner exceeds the daily egress cap', async () => {
    vi.mocked(prisma.share.findUnique).mockResolvedValue(makeShare() as never);
    // Redis counter reports usage just over the free cap (500).
    vi.mocked(redis.incr).mockResolvedValue(501);

    const res = await request(app).get(`/share/${SHARE_ID}`);
    expect(res.status).toBe(429);
    // Must not consume a download when egress-capped.
    expect(prisma.share.updateMany).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────
// GET /vault/shares — list
// ────────────────────────────────────────────────

describe('GET /vault/shares', () => {
  it('lists the caller shares with an active flag', async () => {
    vi.mocked(prisma.share.findMany).mockResolvedValue([
      makeShare(),
      makeShare({ id: 'revoked1revoked1revok', revokedAt: new Date() }),
    ] as never);

    const res = await request(app).get('/vault/shares').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.shares).toHaveLength(2);
    expect(res.body.shares[0].active).toBe(true);
    expect(res.body.shares[1].active).toBe(false);
    expect(res.body.shares[0].fileName).toBe('secret.txt');
  });
});

// ────────────────────────────────────────────────
// DELETE /vault/shares/:shareId — revoke
// ────────────────────────────────────────────────

describe('DELETE /vault/shares/:shareId', () => {
  it('revokes an owned, live share', async () => {
    vi.mocked(prisma.share.updateMany).mockResolvedValue({ count: 1 } as never);

    const res = await request(app).delete(`/vault/shares/${SHARE_ID}`).set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 404 when the share is not owned or already revoked', async () => {
    vi.mocked(prisma.share.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app).delete(`/vault/shares/${SHARE_ID}`).set(authHeader());

    expect(res.status).toBe(404);
  });
});
