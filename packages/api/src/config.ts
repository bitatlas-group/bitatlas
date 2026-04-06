import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PREFIX: z.string().default('bitatlas:'),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.string().transform(v => v === 'true').default('false'),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().default('bitatlas-vault'),
  MINIO_PRESIGNED_URL_EXPIRY: z.coerce.number().default(3600),
  // Public-facing MinIO base URL for URL rewriting (e.g. MINIO_PUBLIC_URL=https://s3.bitatlas.com)
  MINIO_PUBLIC_URL: z.string().default(''),

  CORS_ORIGINS: z.string().default('http://localhost:3001'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),

  // x402 Payment Protocol
  X402_ENABLED: z.string().transform(v => v === 'true').default('false'),
  X402_WALLET_ADDRESS: z.string().default(''),
  X402_FACILITATOR_URL: z.string().default('https://facilitator.x402.org'),
  X402_NETWORK: z.enum(['base', 'base-sepolia']).default('base-sepolia'),
  X402_PRICE_UPLOAD: z.string().default('$0.01'),
  X402_PRICE_DOWNLOAD: z.string().default('$0.005'),
  X402_PRICE_LIST: z.string().default('$0.001'),
  X402_STORAGE_DAYS_INCLUDED: z.coerce.number().default(30),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

export const corsOrigins = config.CORS_ORIGINS.split(',').map(o => o.trim());
