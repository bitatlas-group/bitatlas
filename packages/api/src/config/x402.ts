import type { RoutesConfig } from '@x402/core/server';

// Network identifiers
// Base Mainnet: eip155:8453
// Base Sepolia (testnet): eip155:84532
const NETWORK = process.env.X402_NETWORK === 'base-sepolia' ? 'eip155:84532' : 'eip155:8453';
const PAY_TO = process.env.X402_WALLET_ADDRESS || '';
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';

// Pricing (USDC)
const PRICE_UPLOAD = process.env.X402_PRICE_UPLOAD || '$0.01';        // per upload request (flat)
const PRICE_DOWNLOAD = process.env.X402_PRICE_DOWNLOAD || '$0.005';   // per download request (flat)
const PRICE_LIST = process.env.X402_PRICE_LIST || '$0.001';           // per list request

// Storage included days with upload payment
export const STORAGE_DAYS_INCLUDED = parseInt(process.env.X402_STORAGE_DAYS_INCLUDED || '30', 10);

export const x402Config = {
  enabled: process.env.X402_ENABLED === 'true',
  network: NETWORK,
  payTo: PAY_TO,
  facilitatorUrl: FACILITATOR_URL,
};

/**
 * x402 protected routes configuration.
 * 
 * These routes are ONLY enforced when a request arrives WITHOUT a valid
 * API key or JWT. Authenticated users bypass x402 entirely.
 * 
 * Pricing is flat per-request for MVP. Dynamic per-MB pricing can be
 * added later via settlement overrides.
 */
/**
 * Route paths are relative to where the middleware is mounted.
 * Since authOrPay is mounted at /vault in app.ts, paths here
 * should NOT include the /vault prefix.
 */
export const x402Routes: RoutesConfig = {
  'POST /files/upload-url': {
    accepts: {
      scheme: 'exact',
      price: PRICE_UPLOAD,
      network: NETWORK as any,
      payTo: PAY_TO,
      maxTimeoutSeconds: 120,
    },
    description: 'Generate a presigned upload URL for encrypted file storage',
  },
  'POST /files': {
    accepts: {
      scheme: 'exact',
      price: PRICE_UPLOAD,
      network: NETWORK as any,
      payTo: PAY_TO,
      maxTimeoutSeconds: 120,
    },
    description: 'Register an uploaded file in the BitAtlas vault',
  },
  'GET /files': {
    accepts: {
      scheme: 'exact',
      price: PRICE_LIST,
      network: NETWORK as any,
      payTo: PAY_TO,
      maxTimeoutSeconds: 60,
    },
    description: 'List files in the BitAtlas vault',
  },
  'GET /files/*/download-url': {
    accepts: {
      scheme: 'exact',
      price: PRICE_DOWNLOAD,
      network: NETWORK as any,
      payTo: PAY_TO,
      maxTimeoutSeconds: 60,
    },
    description: 'Get a presigned download URL for an encrypted file',
  },
};
