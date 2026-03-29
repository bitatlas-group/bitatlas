import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { redis, sessionKey } from '../services/redis';
import { prisma } from '../db/client';

export interface AuthUser {
  id: string;
  email: string;
  sessionId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      apiKeyPermissions?: string[];
    }
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  type: 'access';
}

export function signAccessToken(userId: string, email: string, sessionId: string): string {
  return jwt.sign(
    { sub: userId, email, sessionId, type: 'access' } satisfies JwtPayload,
    config.JWT_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

export function signRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign(
    { sub: userId, sessionId, type: 'refresh' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  // Check if it looks like an API key (ba_ prefix)
  if (token.startsWith('ba_')) {
    handleApiKeyAuth(token, req, res, next);
    return;
  }

  // Otherwise validate as JWT
  handleJwtAuth(token, req, res, next);
}

async function handleJwtAuth(
  token: string,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    if (payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    // Check session is still valid in Redis
    const sessionData = await redis.get(sessionKey(payload.sub, payload.sessionId));
    if (!sessionData) {
      res.status(401).json({ error: 'Session expired or revoked' });
      return;
    }

    req.user = { id: payload.sub, email: payload.email, sessionId: payload.sessionId };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
}

async function handleApiKeyAuth(
  rawKey: string,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!apiKey) {
      res.status(401).json({ error: 'Invalid or revoked API key' });
      return;
    }

    // Update last used timestamp asynchronously
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    req.user = { id: apiKey.user.id, email: apiKey.user.email };
    req.apiKeyPermissions = apiKey.permissions as string[];
    next();
  } catch {
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function requirePermission(permission: string) {
  return function (req: Request, res: Response, next: NextFunction): void {
    // JWT auth → full access (apiKeyPermissions not set)
    if (req.apiKeyPermissions === undefined) {
      next();
      return;
    }
    if (req.apiKeyPermissions.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({ error: `API key missing '${permission}' permission` });
  };
}
