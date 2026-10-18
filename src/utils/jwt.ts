import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { REFRESH_TOKEN } from '../constants';
import { ApiError } from './ApiError';

export interface AccessTokenPayload {
  sub: string;
  roles: string[];
  type: 'access';
  /** Issued-at, added by jsonwebtoken. Used to invalidate tokens on password change. */
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface RefreshTokenRecord {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const sign = (payload: object, secret: string, expiresIn: string): string =>
  jwt.sign(payload, secret, { expiresIn } as SignOptions);

export const generateAccessToken = (userId: string, roles: string[]): string =>
  sign({ sub: userId, roles, type: 'access' } satisfies AccessTokenPayload, env.jwt.accessSecret, env.jwt.accessExpiresIn);

export const generateRefreshToken = (userId: string): { token: string; jti: string } => {
  const jti = crypto.randomUUID();
  const token = sign(
    { sub: userId, jti, type: 'refresh' } satisfies RefreshTokenPayload,
    env.jwt.refreshSecret,
    env.jwt.refreshExpiresIn,
  );

  return { token, jti };
};

/** SHA-256 hex digest. Only hashes of refresh tokens are ever persisted. */
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

/** Derives the absolute expiry date from a JWT so it can be stored on the user. */
export const expiryFromToken = (token: string): Date => {
  const decoded = jwt.decode(token);
  if (decoded && typeof decoded === 'object' && typeof decoded.exp === 'number') {
    return new Date(decoded.exp * 1000);
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
    if (decoded.type !== 'access') throw ApiError.unauthorized('Invalid token type');
    return decoded;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') throw ApiError.unauthorized('Invalid token type');
    return decoded;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
};

/** Trims the token list to the newest N entries. */
export const pruneRefreshTokens = (tokens: RefreshTokenRecord[]): RefreshTokenRecord[] =>
  tokens.slice(0, REFRESH_TOKEN.MAX_PER_USER);

export const isRefreshTokenExpired = (record: RefreshTokenRecord): boolean =>
  record.expiresAt.getTime() <= Date.now();
