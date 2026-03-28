import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';

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
  mockApiKey,
  mockUser,
  makeAccessToken,
  TEST_USER_ID,
  TEST_EMAIL,
  sessionPayload,
} from './helpers';

// ── Auth header helper ───────────────────────────
function authHeader() {
  return { Authorization: `Bearer ${makeAccessToken()}` };
}

const KEY_ID = mockApiKey.id;

// ────────────────────────────────────────────────
// Setup
// ────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(redis.get).mockResolvedValue(sessionPayload());
});

// ────────────────────────────────────────────────
// GET /keys
// ────────────────────────────────────────────────

describe('GET /keys', () => {
  it('returns active (non-revoked) keys without the raw key value', async () => {
    // Simulate what Prisma returns with the `select` clause (no keyHash)
    vi.mocked(prisma.apiKey.findMany).mockResolvedValue([{
      id: mockApiKey.id,
      keyPrefix: mockApiKey.keyPrefix,
      name: mockApiKey.name,
      permissions: mockApiKey.permissions,
      lastUsedAt: null,
      expiresAt: null,
      createdAt: mockApiKey.createdAt,
    }] as never);

    const res = await request(app)
      .get('/keys')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.keys).toHaveLength(1);
    expect(res.body.keys[0].id).toBe(KEY_ID);
    expect(res.body.keys[0].keyPrefix).toBe(mockApiKey.keyPrefix);
    // Raw key value must never be returned from GET
    expect(res.body.keys[0].keyHash).toBeUndefined();
    expect(res.body.keys[0].key).toBeUndefined();
  });

  it('returns an empty list when the user has no active keys', async () => {
    vi.mocked(prisma.apiKey.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get('/keys')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.keys).toEqual([]);
  });

  it('scopes the query to the authenticated user and excludes revoked keys', async () => {
    vi.mocked(prisma.apiKey.findMany).mockResolvedValue([]);

    await request(app).get('/keys').set(authHeader());

    expect(vi.mocked(prisma.apiKey.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID, revokedAt: null },
      }),
    );
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/keys');
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────
// POST /keys
// ────────────────────────────────────────────────

describe('POST /keys', () => {
  beforeEach(() => {
    vi.mocked(prisma.apiKey.count).mockResolvedValue(0);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: KEY_ID,
      keyPrefix: mockApiKey.keyPrefix,
      name: mockApiKey.name,
      permissions: ['read', 'write'],
      expiresAt: null,
      createdAt: mockApiKey.createdAt,
    } as never);
  });

  it('creates an API key and returns the raw key exactly once', async () => {
    const res = await request(app)
      .post('/keys')
      .set(authHeader())
      .send({ name: 'CI Key', permissions: ['read', 'write'] });

    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^ba_[0-9a-f]{64}$/);
    expect(res.body.keyPrefix).toMatch(/^ba_/);
    // Raw key must not appear in list endpoint — only returned here
    expect(res.body.id).toBe(KEY_ID);
  });

  it('stores a SHA-256 hash of the raw key, not the raw key itself', async () => {
    const res = await request(app)
      .post('/keys')
      .set(authHeader())
      .send({ name: 'Hash Test' });

    const { key } = res.body;
    const expectedHash = crypto.createHash('sha256').update(key).digest('hex');

    expect(vi.mocked(prisma.apiKey.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ keyHash: expectedHash }),
      }),
    );
  });

  it('allows read-only keys via custom permissions', async () => {
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: KEY_ID,
      keyPrefix: mockApiKey.keyPrefix,
      name: 'Read-only',
      permissions: ['read'],
      expiresAt: null,
      createdAt: mockApiKey.createdAt,
    } as never);

    const res = await request(app)
      .post('/keys')
      .set(authHeader())
      .send({ name: 'Read-only', permissions: ['read'] });

    expect(res.status).toBe(201);
  });

  it('accepts an expiresAt date', async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/keys')
      .set(authHeader())
      .send({ name: 'Expiring Key', expiresAt });

    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.apiKey.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expiresAt: expect.any(Date) }),
      }),
    );
  });

  it('enforces the 10 active key limit', async () => {
    vi.mocked(prisma.apiKey.count).mockResolvedValue(10);

    const res = await request(app)
      .post('/keys')
      .set(authHeader())
      .send({ name: 'Over Limit' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Maximum of 10 active API keys allowed');
  });

  it('allows creation when exactly 9 active keys exist', async () => {
    vi.mocked(prisma.apiKey.count).mockResolvedValue(9);

    const res = await request(app)
      .post('/keys')
      .set(authHeader())
      .send({ name: 'Key 10' });

    expect(res.status).toBe(201);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/keys').send({});
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────
// DELETE /keys/:id
// ────────────────────────────────────────────────

describe('DELETE /keys/:id', () => {
  it('revokes the key by setting revokedAt', async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(mockApiKey as typeof mockApiKey);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({
      ...mockApiKey,
      revokedAt: new Date(),
    } as typeof mockApiKey);

    const res = await request(app)
      .delete(`/keys/${KEY_ID}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(vi.mocked(prisma.apiKey.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: KEY_ID },
        data: { revokedAt: expect.any(Date) },
      }),
    );
  });

  it('returns 404 when the key does not exist or is already revoked', async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .delete(`/keys/${KEY_ID}`)
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('API key not found');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete(`/keys/${KEY_ID}`);
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────
// API key authentication
// ────────────────────────────────────────────────

describe('API key authentication', () => {
  it('grants access to a protected route using a valid ba_ prefixed key', async () => {
    const rawKey = `ba_${'a'.repeat(64)}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Mock prisma.apiKey.findFirst to return key with user relation
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      ...mockApiKey,
      keyHash,
      user: { id: TEST_USER_ID, email: TEST_EMAIL },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as typeof mockUser);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${rawKey}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_USER_ID);
  });

  it('rejects a revoked API key', async () => {
    const rawKey = `ba_${'b'.repeat(64)}`;

    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${rawKey}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or revoked API key');
  });

  it('rejects an expired API key', async () => {
    const rawKey = `ba_${'c'.repeat(64)}`;

    // findFirst returns null because the query filters out expired keys
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${rawKey}`);

    expect(res.status).toBe(401);
  });
});
