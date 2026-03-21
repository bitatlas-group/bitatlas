import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

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
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Error]', err);
    }
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
