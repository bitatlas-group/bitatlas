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
 * 
 * The x402 middleware calls next() after successful payment verification.
 * At that point, no auth header exists but payment was validated.
 * We detect this by checking: no user set + no auth header = x402 paid.
 */
export function x402AnonymousContext(req: Request, res: Response, next: NextFunction): void {
  // If user already set (JWT or API key auth), skip
  if (req.user) {
    next();
    return;
  }

  // If we reach here with no user and no auth header,
  // the x402 middleware must have validated payment and called next().
  // (If x402 was disabled or route didn't match, authOrPay would have
  // returned 401 before reaching this middleware.)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // Has auth header but no user = auth failed upstream, don't mask it
    next();
    return;
  }

  // Assign anonymous user context for x402-paid request
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
