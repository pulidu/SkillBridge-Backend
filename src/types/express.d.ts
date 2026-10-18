import type { Role } from '../constants';
import type { AuthUser } from './index';

/**
 * Augments Express's Request type with the authenticated user and the
 * validation results produced by the `validate` middleware.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Populated by `validate` so handlers read coerced, trusted values. */
      valid?: {
        body: unknown;
        params: unknown;
        query: unknown;
      };
      /** Set by pino-http via genReqId. */
      requestId?: string;
    }
  }
}

/** Express handler that may be async. */
export type AsyncHandler = (
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction,
) => Promise<unknown>;

/** Narrowing helper: returns the authenticated user or throws. */
export const requireUser = (req: Express.Request): AuthUser => {
  if (!req.user) {
    throw new Error('requireUser called on a route without `authenticate`.');
  }
  return req.user;
};

export type { AuthUser, Role };
