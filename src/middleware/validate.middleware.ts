import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'params' | 'query';

interface ValidateOptions {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/**
 * Validates and coerces request input with Zod, then REPLACES the raw value on
 * the request with the parsed one. Controllers therefore only ever read
 * validated, typed data - and payloads such as `{ "$ne": null }` are rejected
 * before they can reach a Mongo query.
 */
export const validate =
  (options: ValidateOptions) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed: Record<Source, unknown> = {
      body: req.body ?? {},
      params: req.params ?? {},
      query: req.query ?? {},
    };

    const errors: { field: string; message: string }[] = [];

    for (const source of ['body', 'params', 'query'] as Source[]) {
      const schema = options[source];
      if (!schema) continue;

      const result = (schema as z.ZodTypeAny).safeParse(parsed[source]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({ field: `${source}.${issue.path.join('.')}`.replace(/\.$/, ''), message: issue.message });
        }
        continue;
      }

      // Express 5 exposes `req.query` via a getter, so assign defensively.
      if (source === 'query') {
        Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
      } else {
        req[source] = result.data;
      }
      parsed[source] = result.data;
    }

    if (errors.length > 0) {
      return next(ApiError.unprocessable('Validation failed', errors));
    }

    req.valid = { body: parsed.body, params: parsed.params, query: parsed.query };
    return next();
  };
