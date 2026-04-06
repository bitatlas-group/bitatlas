import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Anonymous user context for x402-paid requests.
 * 
 * When a request is paid via x402 (no auth header), we assign
 * a temporary anonymous identity so downstream route handlers
 * can work without changes.
 * 
 * The anonymous user gets:
 * - A unique ID per request (not persisted)
 * - No email
 * - Full permissions (they paid for it)
 * - A dedicated storage namespace (x402-anon/)
 */

const X402_ANON_USER_ID = 'x402-anonymous';

/**
 * If no user is set after auth-or-pay, this means the request
 * was paid via x402. Assign an anonymous context.
 */
export function x402AnonymousContext(req: Request, res: Response, next: NextFunction): void {
  // If user already set (JWT or API key auth), skip
  if (req.user) {
    next();
    return;
  }

  // Check if this request was paid via x402 (payment headers present)
  const paymentResponse = req.headers['x-payment-response'] || req.headers['payment-response'];
  if (!paymentResponse) {
    // No auth, no payment — should have been caught earlier
    // but just in case:
    res.status(401).json({ error: 'Authentication or payment required' });
    return;
  }

  // Assign anonymous user context
  const requestId = uuidv4();
  req.user = {
    id: `${X402_ANON_USER_ID}-${requestId}`,
    email: `anon-${requestId}@x402.bitatlas.com`,
  };

  // Mark as x402 paid request for downstream handlers
  (req as any).x402Paid = true;
  (req as any).x402RequestId = requestId;

  next();
}

/**
 * Check if a request was paid via x402.
 */
export function isX402Paid(req: Request): boolean {
  return (req as any).x402Paid === true;
}
