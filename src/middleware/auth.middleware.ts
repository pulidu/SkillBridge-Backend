import type { NextFunction, Request, Response } from 'express';
import { User } from '../models';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Verifies the access token, loads the user and attaches them to the request.
 *
 * Rejects: missing token (401), invalid/expired token (401), unknown user (401),
 * suspended account (403). Also enforces that a password change invalidates
 * tokens issued before it.
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token is missing');
  }

  const token = header.slice(7).trim();
  const payload = verifyAccessToken(token);

  // `isDeleted: false` matters: a soft-deleted account's access tokens would
  // otherwise keep working until they expired.
  const user = await User.findOne({ _id: payload.sub, isDeleted: false }).select(
    'fullName email roles avatarUrl status passwordChangedAt',
  );

  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.status === 'suspended') throw ApiError.forbidden('This account has been suspended');

  const tokenIssuedAt = payload.iat ? payload.iat * 1000 : 0;
  if (user.passwordChangedAt && tokenIssuedAt < user.passwordChangedAt.getTime() - 1000) {
    throw ApiError.unauthorized('Session is no longer valid, please sign in again');
  }

  req.user = {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    roles: user.roles,
    avatarUrl: user.avatarUrl,
    status: user.status,
  };

  next();
});

/** Attaches the user when a valid token is present, but never rejects. */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  try {
    const payload = verifyAccessToken(header.slice(7).trim());
    const user = await User.findOne({ _id: payload.sub, isDeleted: false }).select(
      'fullName email roles avatarUrl status',
    );

    if (user && user.status === 'active') {
      req.user = {
        id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        avatarUrl: user.avatarUrl,
        status: user.status,
      };
    }
  } catch {
    // Ignore: the route treats the request as anonymous.
  }

  return next();
});
