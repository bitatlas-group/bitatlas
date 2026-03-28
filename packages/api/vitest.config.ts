import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test-jwt-secret-minimum-32-chars-long!!',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: '9000',
      MINIO_USE_SSL: 'false',
      MINIO_ACCESS_KEY: 'testkey',
      MINIO_SECRET_KEY: 'testsecret',
      MINIO_BUCKET: 'bitatlas-vault',
      MINIO_PRESIGNED_URL_EXPIRY: '3600',
      MINIO_PUBLIC_URL: '',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_PREFIX: 'bitatlas:',
      CORS_ORIGINS: 'http://localhost:3000',
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX_REQUESTS: '1000',
      AUTH_RATE_LIMIT_MAX: '1000',
    },
  },
});
