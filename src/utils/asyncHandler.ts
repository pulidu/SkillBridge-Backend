import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so a rejected promise is forwarded to Express's
 * error pipeline instead of becoming an unhandled rejection.
 */
export const asyncHandler =
  <T>(handler: (req: Request, res: Response, next: NextFunction) => Promise<T>): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };
