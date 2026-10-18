import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '../constants';
import { ApiError } from '../utils/ApiError';

/**
 * Coarse role gate. Must run after `authenticate`.
 *
 * Resource-level ownership (does this instructor own this course?) is NOT
 * checked here - it is asserted in the service layer.
 */
export const authorize =
  (...allowed: Role[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));

    const permitted = req.user.roles.some((role) => allowed.includes(role));
    if (!permitted) {
      return next(
        ApiError.forbidden(
          `This action requires one of the following roles: ${allowed.join(', ')}`,
        ),
      );
    }

    return next();
  };
