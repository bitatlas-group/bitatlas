import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis(config.REDIS_URL, {
  keyPrefix: config.REDIS_PREFIX,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

// Session key helpers
export const sessionKey = (userId: string, sessionId: string) =>
  `session:${userId}:${sessionId}`;

export const refreshTokenKey = (token: string) =>
  `refresh:${token}`;

export const rotatedTokenKey = (token: string) =>
  `rotated:${token}`;

export const apiKeyRateLimitKey = (keyId: string) =>
  `ratelimit:apikey:${keyId}`;
