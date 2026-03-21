import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/client';
import { redis, sessionKey, refreshTokenKey } from '../services/redis';
import {
  signAccessToken,
  signRefreshToken,
  requireAuth,
} from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';
import { config } from '../config';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /auth/register
router.post('/register', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    // Return generic error to avoid user enumeration
    res.status(409).json({ error: 'Registration failed' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const encryptionSalt = crypto.randomBytes(32).toString('hex');

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      encryptionSalt,
    },
    select: { id: true, email: true, encryptionSalt: true, plan: true, createdAt: true },
  });

  const sessionId = uuidv4();
  const accessToken = signAccessToken(user.id, user.email, sessionId);
  const refreshToken = signRefreshToken(user.id, sessionId);

  // Store session in Redis (TTL = refresh token expiry: 7 days)
  await redis.setex(
    sessionKey(user.id, sessionId),
    7 * 24 * 60 * 60,
    JSON.stringify({ userId: user.id, createdAt: Date.now() })
  );

  // Store refresh token
  await redis.setex(
    refreshTokenKey(refreshToken),
    7 * 24 * 60 * 60,
    JSON.stringify({ userId: user.id, sessionId })
  );

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
    },
    encryptionSalt: user.encryptionSalt,
    accessToken,
    refreshToken,
  });
});

// POST /auth/login
router.post('/login', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      encryptionSalt: true,
      plan: true,
      storageUsedBytes: true,
      storageLimitBytes: true,
    },
  });

  // Always run bcrypt compare to prevent timing attacks
  const dummyHash = '$2b$12$invalidhashfortimingprotectionxxx';
  const passwordMatch = await bcrypt.compare(
    password,
    user?.passwordHash ?? dummyHash
  );

  if (!user || !passwordMatch) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const sessionId = uuidv4();
  const accessToken = signAccessToken(user.id, user.email, sessionId);
  const refreshToken = signRefreshToken(user.id, sessionId);

  await redis.setex(
    sessionKey(user.id, sessionId),
    7 * 24 * 60 * 60,
    JSON.stringify({ userId: user.id, createdAt: Date.now() })
  );

  await redis.setex(
    refreshTokenKey(refreshToken),
    7 * 24 * 60 * 60,
    JSON.stringify({ userId: user.id, sessionId })
  );

  res.json({
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      storageUsedBytes: user.storageUsedBytes.toString(),
      storageLimitBytes: user.storageLimitBytes.toString(),
    },
    encryptionSalt: user.encryptionSalt,
    accessToken,
    refreshToken,
  });
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Missing refresh token' });
    return;
  }

  const { refreshToken } = parsed.data;

  let payload: { sub: string; sessionId: string; type: string };
  try {
    payload = jwt.verify(refreshToken, config.JWT_SECRET) as typeof payload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  if (payload.type !== 'refresh') {
    res.status(401).json({ error: 'Invalid token type' });
    return;
  }

  const storedData = await redis.get(refreshTokenKey(refreshToken));
  if (!storedData) {
    res.status(401).json({ error: 'Refresh token revoked or expired' });
    return;
  }

  const stored = JSON.parse(storedData) as { userId: string; sessionId: string };

  // Rotate: delete old refresh token, issue new pair
  await redis.del(refreshTokenKey(refreshToken));

  const newSessionId = uuidv4();
  const newRefreshToken = signRefreshToken(stored.userId, newSessionId);

  // Get current user email for new access token
  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: { email: true },
  });

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  // Move session to new sessionId
  await redis.del(sessionKey(stored.userId, stored.sessionId));
  await redis.setex(
    sessionKey(stored.userId, newSessionId),
    7 * 24 * 60 * 60,
    JSON.stringify({ userId: stored.userId, createdAt: Date.now() })
  );

  await redis.setex(
    refreshTokenKey(newRefreshToken),
    7 * 24 * 60 * 60,
    JSON.stringify({ userId: stored.userId, sessionId: newSessionId })
  );

  const finalAccessToken = signAccessToken(stored.userId, user.email, newSessionId);

  res.json({ accessToken: finalAccessToken, refreshToken: newRefreshToken });
});

// POST /auth/logout
router.post('/logout', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id: userId, sessionId } = req.user!;

  if (sessionId) {
    await redis.del(sessionKey(userId, sessionId));
  }

  res.json({ ok: true });
});

// GET /auth/me
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      plan: true,
      storageUsedBytes: true,
      storageLimitBytes: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    ...user,
    storageUsedBytes: user.storageUsedBytes.toString(),
    storageLimitBytes: user.storageLimitBytes.toString(),
  });
});

export default router;
