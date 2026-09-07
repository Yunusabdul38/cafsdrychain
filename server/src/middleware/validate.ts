import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Validates and *replaces* req.body/query/params with the parsed, typed result,
 * stripping unknown fields — a first line of defense against injection/overpost.
 */
export function validate<B extends ZodTypeAny>(schema: {
  body?: B;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) Object.assign(req.query, schema.query.parse(req.query));
      if (schema.params) Object.assign(req.params, schema.params.parse(req.params));
      next();
    } catch (err) {
      next(err);
    }
  };
}
