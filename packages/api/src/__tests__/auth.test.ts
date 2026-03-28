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

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$mockedhashvalue'),
    compare: vi.fn().mockResolvedValue(true),
  },
  hash: vi.fn().mockResolvedValue('$2b$12$mockedhashvalue'),
  compare: vi.fn().mockResolvedValue(true),
}));

// --- Imports (after mocks) ---

import { app } from '../app';
import { prisma } from '../db/client';
import { redis } from '../services/redis';
import bcrypt from 'bcryptjs';
import {
  mockUser,
  makeAccessToken,
  makeRefreshToken,
  TEST_USER_ID,
  TEST_EMAIL,
  TEST_SESSION_ID,
  sessionPayload,
} from './helpers';

// ────────────────────────────────────────────────
// POST /auth/register
// ────────────────────────────────────────────────

describe('POST /auth/register', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      ...mockUser,
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      plan: 'free',
      encryptionSalt: 'abc123encryptionsalt',
      createdAt: mockUser.createdAt,
    } as typeof mockUser);
    vi.mocked(redis.setex).mockResolvedValue('OK');
  });

  it('creates a user and returns tokens + encryptionSalt', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'strongpassword123' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      user: {
        email: TEST_EMAIL,
        plan: 'free',
      },
      encryptionSalt: expect.any(String),
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('stores two Redis entries (session + refresh token)', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'strongpassword123' });

    expect(vi.mocked(redis.setex)).toHaveBeenCalledTimes(2);
  });

  it('returns 409 for duplicate email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as typeof mockUser);

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'existing@example.com', password: 'strongpassword123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Registration failed');
  });

  it('returns 400 for password shorter than 12 characters', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details.password).toBeDefined();
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'strongpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.details.email).toBeDefined();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password: 'strongpassword123' });

    expect(res.status).toBe(400);
  });
});

// ────────────────────────────────────────────────
// POST /auth/login
// ────────────────────────────────────────────────

describe('POST /auth/login', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as typeof mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(redis.setex).mockResolvedValue('OK');
  });

  it('returns tokens and encryptionSalt for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user: {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        plan: 'free',
        storageUsedBytes: '0',
        storageLimitBytes: '1073741824',
      },
      encryptionSalt: 'abc123encryptionsalt',
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('returns 401 for wrong password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 401 for unknown email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'somepassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('always calls bcrypt.compare even for unknown users (timing safety)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'somepassword' });

    // bcrypt.compare must be called regardless (timing attack prevention)
    expect(vi.mocked(bcrypt.compare)).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL });

    expect(res.status).toBe(400);
    expect(res.body.details.password).toBeDefined();
  });
});

// ────────────────────────────────────────────────
// POST /auth/refresh
// ────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('rotates tokens and invalidates old session', async () => {
    const refreshToken = makeRefreshToken(TEST_USER_ID, TEST_SESSION_ID);

    vi.mocked(redis.get).mockResolvedValueOnce(
      JSON.stringify({ userId: TEST_USER_ID, sessionId: TEST_SESSION_ID }),
    );
    vi.mocked(redis.del).mockResolvedValue(1);
    vi.mocked(redis.setex).mockResolvedValue('OK');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as typeof mockUser);

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    // New tokens must differ from the originals
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it('deletes old session and old refresh token from Redis', async () => {
    const refreshToken = makeRefreshToken(TEST_USER_ID, TEST_SESSION_ID);

    vi.mocked(redis.get).mockResolvedValueOnce(
      JSON.stringify({ userId: TEST_USER_ID, sessionId: TEST_SESSION_ID }),
    );
    vi.mocked(redis.del).mockResolvedValue(1);
    vi.mocked(redis.setex).mockResolvedValue('OK');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as typeof mockUser);

    await request(app).post('/auth/refresh').send({ refreshToken });

    // del called twice: old refresh token + old session
    expect(vi.mocked(redis.del)).toHaveBeenCalledTimes(2);
  });

  it('returns 401 for an invalid refresh token', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'not.a.valid.jwt' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired refresh token');
  });

  it('returns 401 when refresh token is revoked (not in Redis)', async () => {
    const refreshToken = makeRefreshToken(TEST_USER_ID, TEST_SESSION_ID);
    vi.mocked(redis.get).mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Refresh token revoked or expired');
  });

  it('returns 401 when an access token is submitted instead of refresh token', async () => {
    const accessToken = makeAccessToken(TEST_USER_ID, TEST_EMAIL, TEST_SESSION_ID);

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: accessToken });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token type');
  });

  it('returns 400 when refreshToken field is missing', async () => {
    const res = await request(app).post('/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing refresh token');
  });
});

// ────────────────────────────────────────────────
// POST /auth/logout
// ────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('deletes session from Redis and returns ok', async () => {
    vi.mocked(redis.get).mockResolvedValue(sessionPayload());
    vi.mocked(redis.del).mockResolvedValue(1);

    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${makeAccessToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(vi.mocked(redis.del)).toHaveBeenCalledTimes(1);
  });

  it('returns 401 without authorization header', async () => {
    const res = await request(app).post('/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing authorization header');
  });

  it('returns 401 when session is missing from Redis (expired)', async () => {
    vi.mocked(redis.get).mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${makeAccessToken()}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Session expired or revoked');
  });
});

// ────────────────────────────────────────────────
// GET /auth/me
// ────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('returns user profile without passwordHash', async () => {
    vi.mocked(redis.get).mockResolvedValue(sessionPayload());
    // Simulate what Prisma returns with the `select` clause (no passwordHash)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      emailVerified: mockUser.emailVerified,
      plan: mockUser.plan,
      storageUsedBytes: mockUser.storageUsedBytes,
      storageLimitBytes: mockUser.storageLimitBytes,
      createdAt: mockUser.createdAt,
    } as typeof mockUser);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${makeAccessToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_USER_ID);
    expect(res.body.email).toBe(TEST_EMAIL);
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.storageUsedBytes).toBe('0');
    expect(res.body.storageLimitBytes).toBe('1073741824');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 404 when user is deleted after token issuance', async () => {
    vi.mocked(redis.get).mockResolvedValue(sessionPayload());
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${makeAccessToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });
});
