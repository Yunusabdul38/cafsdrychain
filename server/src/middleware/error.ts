import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';
import { env } from '../env.js';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    /** Structured context a client can act on, e.g. the conflicting record. */
    public details?: unknown
  ) {
    super(message);
  }
}

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
};

// Centralized error handler — never leaks stack traces or internals to clients.
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    const fields = Object.keys(err.flatten().fieldErrors);
    res.locals.logReason = `validation failed: ${fields.join(', ') || 'body'}`;
    return res.status(400).json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof AppError) {
    // Picked up by the request logger, so a refused request says why.
    res.locals.logReason = err.message;
    return res
      .status(err.status)
      .json({ error: err.message, code: err.code, details: err.details });
  }

  logger.error({ err }, 'Unhandled error');
  res.locals.logReason = err instanceof Error ? err.message : 'unhandled error';
  res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' && err instanceof Error
      ? { detail: err.message }
      : {}),
  });
};
