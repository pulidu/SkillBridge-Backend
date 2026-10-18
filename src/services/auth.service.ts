import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import type { Role } from '../constants';
import { User, toUserResponse, type IUser, type RefreshToken, type UserDocument } from '../models';
import type { AuthUser } from '../types';
import { ApiError } from '../utils/ApiError';
import {
  expiryFromToken,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  isRefreshTokenExpired,
  pruneRefreshTokens,
  verifyRefreshToken,
} from '../utils/jwt';

export interface AuthResult {
  user: ReturnType<typeof toUserResponse>;
  accessToken: string;
  refreshToken: string;
}

/** Hashes a plaintext password with the configured cost factor. */
export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, env.bcryptSaltRounds);

/** Registers a new learner. Self-registration can never grant a privileged role. */
export const registerUser = async (input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthResult> => {
  const existing = await User.findOne({ email: input.email });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const password = await hashPassword(input.password);

  const user = await User.create({
    fullName: input.fullName,
    email: input.email,
    password,
    roles: ['student'] satisfies Role[],
  });

  return issueSession(user);
};

/** Verifies credentials and issues a fresh token pair. */
export const loginUser = async (input: {
  email: string;
  password: string;
}): Promise<AuthResult> => {
  // Soft-deleted accounts are excluded: deleting an account must not leave a
  // way to sign back in, and the unique email index still owns that address.
  const user = await User.findOne({ email: input.email, isDeleted: false }).select(
    '+password +passwordChangedAt +refreshTokens',
  );

  // Same message for unknown email and wrong password to avoid account probing.
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const isValid = await user.comparePassword(input.password);
  if (!isValid) throw ApiError.unauthorized('Invalid email or password');

  if (user.status === 'suspended') throw ApiError.forbidden('This account has been suspended');

  user.lastLoginAt = new Date();
  await user.save();

  return issueSession(user);
};

/** Rotates the refresh token and mints a new access token. */
export const refreshSession = async (token: string): Promise<AuthResult> => {
  const payload = verifyRefreshToken(token);
  const user = await User.findOne({ _id: payload.sub, isDeleted: false }).select('+refreshTokens');

  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.status === 'suspended') throw ApiError.forbidden('This account has been suspended');

  const presentedHash = hashToken(token);
  const index = user.refreshTokens.findIndex((entry) => entry.token === presentedHash);

  if (index === -1) {
    // Token presented is not in the allow-list: either replayed or revoked.
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  user.refreshTokens.splice(index, 1);

  return issueSession(user);
};

/** Revokes a single refresh token (logout). Safe to call more than once. */
export const revokeRefreshToken = async (token: string): Promise<void> => {
  const presentedHash = hashToken(token);
  const user = await User.findOne({ 'refreshTokens.token': presentedHash }).select('+refreshTokens');
  if (!user) return;

  user.refreshTokens = user.refreshTokens.filter((entry) => entry.token !== presentedHash);
  await user.save();
};

/** Revokes every session for a user (password change, suspension). */
export const revokeAllSessions = async (userId: string): Promise<void> => {
  await User.updateOne({ _id: userId }, { $set: { refreshTokens: [] } });
};

/** Loads the profile for the authenticated user. */
export const getProfile = async (userId: string): Promise<ReturnType<typeof toUserResponse>> => {
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) throw ApiError.notFound('User not found');
  return toUserResponse(user);
};

/** Updates the caller's own profile fields. */
export const updateOwnProfile = async (
  userId: string,
  input: { fullName?: string; avatarUrl?: string; bio?: string },
): Promise<ReturnType<typeof toUserResponse>> => {
  const user = await User.findByIdAndUpdate(userId, { $set: input }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  return toUserResponse(user);
};

/** Changes a password after re-verifying the current one. */
export const changePassword = async (
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> => {
  const user = await User.findById(userId).select('+password +refreshTokens');
  if (!user) throw ApiError.notFound('User not found');

  const isValid = await user.comparePassword(input.currentPassword);
  if (!isValid) throw ApiError.unauthorized('Current password is incorrect');

  user.password = await hashPassword(input.newPassword);
  // Invalidate all other sessions and all previously issued access tokens.
  user.passwordChangedAt = new Date();
  user.refreshTokens = [];
  await user.save();
};

/** Signs a token pair and records the hashed refresh token on the user. */
const issueSession = async (user: UserDocument): Promise<AuthResult> => {
  const accessToken = generateAccessToken(String(user._id), user.roles);
  const { token: refreshToken } = generateRefreshToken(String(user._id));

  const stored: RefreshToken = {
    token: hashToken(refreshToken),
    expiresAt: expiryFromToken(refreshToken),
    createdAt: new Date(),
  };

  user.refreshTokens = pruneRefreshTokens([
    stored,
    ...user.refreshTokens.filter((entry) => !isRefreshTokenExpired(entry)),
  ]);

  await user.save();

  return { user: toUserResponse(user), accessToken, refreshToken };
};

/** Maps a stored user document to the request-scoped auth user. */
export const toAuthUser = (user: IUser & { _id: unknown }): AuthUser => ({
  id: String(user._id),
  fullName: user.fullName,
  email: user.email,
  roles: user.roles,
  avatarUrl: user.avatarUrl,
  status: user.status,
});
