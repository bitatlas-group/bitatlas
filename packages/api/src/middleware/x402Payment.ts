import { Request, Response, NextFunction } from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { x402Config, x402Routes } from '../config/x402';
import { logger } from '../services/logger';

let x402Middleware: ((req: Request, res: Response, next: NextFunction) => Promise<void>) | null = null;

/**
 * Initialize the x402 payment middleware.
 * Call once during server startup.
 */
export function initX402Middleware(): void {
  if (!x402Config.enabled) {
    logger.info('[x402] Disabled (X402_ENABLED != true)');
    return;
  }

  if (!x402Config.payTo) {
    logger.error('[x402] X402_WALLET_ADDRESS not set — disabling x402');
    return;
  }

  const facilitatorClient = new HTTPFacilitatorClient({
    url: x402Config.facilitatorUrl,
  });

  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(x402Config.network as any, new ExactEvmScheme());

  x402Middleware = paymentMiddleware(
    x402Routes,
    resourceServer,
    {
      appName: 'BitAtlas',
      testnet: x402Config.network === 'eip155:84532',
    },
    undefined, // paywall provider
    false,     // syncFacilitatorOnStart — disable to avoid crash if facilitator unreachable at boot
  );

  logger.info({
    network: x402Config.network,
    payTo: x402Config.payTo,
    facilitator: x402Config.facilitatorUrl,
    routes: Object.keys(x402Routes).length,
  }, '[x402] Payment middleware initialized');
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
