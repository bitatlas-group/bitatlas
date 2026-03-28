import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../services/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Error) {
    // Always log errors — including production. Silent 500s are invisible.
    logger.error({ err, message: err.message, stack: err.stack }, '[Error Handler]');
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  logger.error({ err }, '[Error Handler] Unknown error');
  res.status(500).json({ error: 'Internal server error' });
}
