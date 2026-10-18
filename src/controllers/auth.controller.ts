import type { Request, Response } from 'express';
import { env } from '../config/env';
import { REFRESH_TOKEN } from '../constants';
import * as authService from '../services/auth.service';
import type { AuthUser } from '../types';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '../validators/auth.validator';

/** Cookie options shared by every refresh-cookie write. */
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
  ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
});

const readRefreshCookie = (req: Request): string | undefined =>
  req.cookies?.[REFRESH_TOKEN.COOKIE_NAME] as string | undefined;

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body as RegisterInput);

  res.cookie(REFRESH_TOKEN.COOKIE_NAME, result.refreshToken, refreshCookieOptions());

  return sendCreated(res, { user: result.user, accessToken: result.accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body as LoginInput);

  res.cookie(REFRESH_TOKEN.COOKIE_NAME, result.refreshToken, refreshCookieOptions());

  return sendSuccess(res, { user: result.user, accessToken: result.accessToken });
});

/** Rotates the refresh cookie and returns a new access token. */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = readRefreshCookie(req);
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  const result = await authService.refreshSession(token);

  res.cookie(REFRESH_TOKEN.COOKIE_NAME, result.refreshToken, refreshCookieOptions());

  return sendSuccess(res, { user: result.user, accessToken: result.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = readRefreshCookie(req);
  if (token) await authService.revokeRefreshToken(token);

  res.clearCookie(REFRESH_TOKEN.COOKIE_NAME, { ...refreshCookieOptions(), maxAge: undefined });

  return sendSuccess(res, { message: 'Signed out' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const profile = await authService.getProfile(user.id);
  return sendSuccess(res, profile);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const profile = await authService.updateOwnProfile(user.id, req.body as UpdateProfileInput);
  return sendSuccess(res, profile);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const input = req.body as ChangePasswordInput;

  await authService.changePassword(user.id, input);
  res.clearCookie(REFRESH_TOKEN.COOKIE_NAME, { ...refreshCookieOptions(), maxAge: undefined });

  return sendSuccess(res, { message: 'Password updated, please sign in again' });
});
