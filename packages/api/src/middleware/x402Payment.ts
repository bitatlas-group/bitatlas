import { Request, Response, NextFunction } from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import type { FacilitatorConfig } from '@x402/core/server';
import { x402Config, x402Routes } from '../config/x402';
import { logger } from '../services/logger';

let x402Middleware: ((req: Request, res: Response, next: NextFunction) => Promise<void>) | null = null;

/**
 * Build CDP JWT auth headers for the facilitator.
 * Uses @coinbase/cdp-sdk to sign requests with Ed25519 keys.
 */
function buildCdpAuthHeaders(apiKeyId: string, apiKeySecret: string, facilitatorUrl: string): FacilitatorConfig['createAuthHeaders'] {
  let generateJwt: any;
  try {
    generateJwt = require('@coinbase/cdp-sdk/auth').generateJwt;
  } catch {
    logger.error('[x402] @coinbase/cdp-sdk not installed — cannot use CDP facilitator');
    return undefined;
  }

  const url = new URL(facilitatorUrl);
  const requestHost = url.host;

  return async () => {
    const makeHeaders = async (method: string, path: string) => {
      const token = await generateJwt({
        apiKeyId,
        apiKeySecret,
        requestMethod: method,
        requestHost,
        requestPath: url.pathname + '/' + path,
        expiresIn: 120,
      });
      return { Authorization: `Bearer ${token}` };
    };

    return {
      verify: await makeHeaders('POST', 'verify'),
      settle: await makeHeaders('POST', 'settle'),
      supported: await makeHeaders('GET', 'supported'),
    };
  };
}

/**
 * Initialize the x402 payment middleware.
 * Call once during server startup. Facilitator sync happens async
 * and retries in the background if it fails on first attempt.
 */
export async function initX402Middleware(): Promise<void> {
  if (!x402Config.enabled) {
    logger.info('[x402] Disabled (X402_ENABLED != true)');
    return;
  }

  if (!x402Config.payTo) {
    logger.error('[x402] X402_WALLET_ADDRESS not set — disabling x402');
    return;
  }

  // Build facilitator client config — with CDP auth if keys are provided
  const facilitatorConfig: FacilitatorConfig = {
    url: x402Config.facilitatorUrl,
  };

  if (x402Config.cdpApiKeyId && x402Config.cdpApiKeySecret) {
    facilitatorConfig.createAuthHeaders = buildCdpAuthHeaders(
      x402Config.cdpApiKeyId,
      x402Config.cdpApiKeySecret,
      x402Config.facilitatorUrl,
    );
    logger.info('[x402] Using CDP facilitator with JWT auth');
  }

  const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(x402Config.network as any, new ExactEvmScheme());

  // Create middleware without auto-sync (avoids crash if facilitator unreachable)
  x402Middleware = paymentMiddleware(
    x402Routes,
    resourceServer,
    {
      appName: 'BitAtlas',
      testnet: x402Config.network === 'eip155:84532',
    },
    undefined, // paywall provider
    false,     // syncFacilitatorOnStart — we do it manually below
  );

  logger.info({
    network: x402Config.network,
    payTo: x402Config.payTo,
    facilitator: x402Config.facilitatorUrl,
    routes: Object.keys(x402Routes).length,
  }, '[x402] Payment middleware initialized');

  // Sync with facilitator async — retry up to 5 times
  syncFacilitator(resourceServer, 5, 5000).catch((err) => {
    logger.error({ err: (err as Error).message }, '[x402] Failed to sync with facilitator after retries — payments will not work until facilitator is reachable');
  });
}

async function syncFacilitator(
  resourceServer: x402ResourceServer,
  maxRetries: number,
  delayMs: number,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await resourceServer.initialize();
      logger.info('[x402] Facilitator sync complete — payments active');
      return;
    } catch (err) {
      logger.warn(
        { attempt, maxRetries, err: (err as Error).message },
        '[x402] Facilitator sync attempt failed',
      );
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw new Error('Facilitator sync failed after all retries');
}

/**
 * Auth-or-pay middleware.
 * 
 * If the request has a valid Authorization header (JWT or API key),
 * skip x402 and proceed to normal auth flow.
 * 
 * If no auth header is present, enforce x402 payment.
 * This enables two access paths:
 *   1. Registered users with API keys → free access
 *   2. Anonymous agents → pay-per-request via x402
 */
export function authOrPay(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // If auth header present, skip x402 — let normal auth middleware handle it
  if (authHeader && authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  // No auth header — enforce x402 payment if enabled
  if (!x402Middleware) {
    // x402 disabled and no auth → reject
    res.status(401).json({
      error: 'Authentication required',
      message: 'Provide an API key via Authorization header, or pay via x402 protocol',
    });
    return;
  }

  // Run x402 payment middleware
  x402Middleware(req, res, next).catch((err) => {
    logger.error({ err }, '[x402] Payment middleware error');
    res.status(500).json({ error: 'Payment processing error' });
  });
}
