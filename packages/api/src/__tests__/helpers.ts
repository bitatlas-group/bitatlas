import jwt from 'jsonwebtoken';

// Must match vitest.config.ts env.JWT_SECRET
export const TEST_JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long!!';

export const TEST_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const TEST_EMAIL = 'test@example.com';
export const TEST_SESSION_ID = 'test-session-id-1234-5678-abcd';

export function makeAccessToken(
  userId = TEST_USER_ID,
  email = TEST_EMAIL,
  sessionId = TEST_SESSION_ID,
): string {
  return jwt.sign(
    { sub: userId, email, sessionId, type: 'access' },
    TEST_JWT_SECRET,
    { expiresIn: '15m' },
  );
}

export function makeRefreshToken(
  userId = TEST_USER_ID,
  sessionId = TEST_SESSION_ID,
): string {
  return jwt.sign(
    { sub: userId, sessionId, type: 'refresh' },
    TEST_JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export const mockUser = {
  id: TEST_USER_ID,
  email: TEST_EMAIL,
  emailVerified: false,
  passwordHash: '$2b$12$testhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  encryptionSalt: 'abc123encryptionsalt',
  emergencySalt: null,
  plan: 'free',
  storageUsedBytes: BigInt(0),
  storageLimitBytes: BigInt(1073741824),
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

export const mockFile = {
  id: 'f11e1234-5678-abcd-ef12-345678901234',
  userId: TEST_USER_ID,
  name: 'secret.txt',
  mimeType: 'text/plain',
  sizeBytes: BigInt(1024),
  originalSizeBytes: null,
  storageKey: `user/${TEST_USER_ID}/uuid-key-value`,
  ownerEncryptedKey: 'base64encryptedkey==',
  ownerIv: 'base64iv==',
  fileIv: 'base64fileiv==',
  authTag: 'base64authtag==',
  emergencyEncryptedKey: null,
  emergencyIv: null,
  folderId: null,
  category: null,
  tags: [],
  deletedAt: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

export const mockFolder = {
  id: 'f01de012-3456-7890-abcd-ef1234567890',
  userId: TEST_USER_ID,
  name: 'My Documents',
  parentId: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
};

export const mockApiKey = {
  id: 'a00cde12-3456-7890-abcd-ef1234567890',
  userId: TEST_USER_ID,
  keyHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  keyPrefix: 'ba_abcd12',
  name: 'Test Key',
  permissions: ['read', 'write'],
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
};

/** Valid session JSON stored in Redis for JWT auth */
export function sessionPayload(userId = TEST_USER_ID): string {
  return JSON.stringify({ userId, createdAt: Date.now() });
}
