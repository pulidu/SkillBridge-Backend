"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAuthUser = exports.changePassword = exports.updateOwnProfile = exports.getProfile = exports.revokeAllSessions = exports.revokeRefreshToken = exports.refreshSession = exports.loginUser = exports.registerUser = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../config/env");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const jwt_1 = require("../utils/jwt");
/** Hashes a plaintext password with the configured cost factor. */
const hashPassword = (plain) => bcryptjs_1.default.hash(plain, env_1.env.bcryptSaltRounds);
exports.hashPassword = hashPassword;
/** Registers a new learner. Self-registration can never grant a privileged role. */
const registerUser = async (input) => {
    const existing = await models_1.User.findOne({ email: input.email });
    if (existing)
        throw ApiError_1.ApiError.conflict('An account with that email already exists');
    const password = await (0, exports.hashPassword)(input.password);
    const user = await models_1.User.create({
        fullName: input.fullName,
        email: input.email,
        password,
        roles: ['student'],
    });
    return issueSession(user);
};
exports.registerUser = registerUser;
/** Verifies credentials and issues a fresh token pair. */
const loginUser = async (input) => {
    // Soft-deleted accounts are excluded: deleting an account must not leave a
    // way to sign back in, and the unique email index still owns that address.
    const user = await models_1.User.findOne({ email: input.email, isDeleted: false }).select('+password +passwordChangedAt +refreshTokens');
    // Same message for unknown email and wrong password to avoid account probing.
    if (!user)
        throw ApiError_1.ApiError.unauthorized('Invalid email or password');
    const isValid = await user.comparePassword(input.password);
    if (!isValid)
        throw ApiError_1.ApiError.unauthorized('Invalid email or password');
    if (user.status === 'suspended')
        throw ApiError_1.ApiError.forbidden('This account has been suspended');
    user.lastLoginAt = new Date();
    await user.save();
    return issueSession(user);
};
exports.loginUser = loginUser;
/** Rotates the refresh token and mints a new access token. */
const refreshSession = async (token) => {
    const payload = (0, jwt_1.verifyRefreshToken)(token);
    const user = await models_1.User.findOne({ _id: payload.sub, isDeleted: false }).select('+refreshTokens');
    if (!user)
        throw ApiError_1.ApiError.unauthorized('Account no longer exists');
    if (user.status === 'suspended')
        throw ApiError_1.ApiError.forbidden('This account has been suspended');
    const presentedHash = (0, jwt_1.hashToken)(token);
    const index = user.refreshTokens.findIndex((entry) => entry.token === presentedHash);
    if (index === -1) {
        // Token presented is not in the allow-list: either replayed or revoked.
        throw ApiError_1.ApiError.unauthorized('Refresh token is no longer valid');
    }
    user.refreshTokens.splice(index, 1);
    return issueSession(user);
};
exports.refreshSession = refreshSession;
/** Revokes a single refresh token (logout). Safe to call more than once. */
const revokeRefreshToken = async (token) => {
    const presentedHash = (0, jwt_1.hashToken)(token);
    const user = await models_1.User.findOne({ 'refreshTokens.token': presentedHash }).select('+refreshTokens');
    if (!user)
        return;
    user.refreshTokens = user.refreshTokens.filter((entry) => entry.token !== presentedHash);
    await user.save();
};
exports.revokeRefreshToken = revokeRefreshToken;
/** Revokes every session for a user (password change, suspension). */
const revokeAllSessions = async (userId) => {
    await models_1.User.updateOne({ _id: userId }, { $set: { refreshTokens: [] } });
};
exports.revokeAllSessions = revokeAllSessions;
/** Loads the profile for the authenticated user. */
const getProfile = async (userId) => {
    const user = await models_1.User.findOne({ _id: userId, isDeleted: false });
    if (!user)
        throw ApiError_1.ApiError.notFound('User not found');
    return (0, models_1.toUserResponse)(user);
};
exports.getProfile = getProfile;
/** Updates the caller's own profile fields. */
const updateOwnProfile = async (userId, input) => {
    const user = await models_1.User.findByIdAndUpdate(userId, { $set: input }, { new: true, runValidators: true });
    if (!user)
        throw ApiError_1.ApiError.notFound('User not found');
    return (0, models_1.toUserResponse)(user);
};
exports.updateOwnProfile = updateOwnProfile;
/** Changes a password after re-verifying the current one. */
const changePassword = async (userId, input) => {
    const user = await models_1.User.findById(userId).select('+password +refreshTokens');
    if (!user)
        throw ApiError_1.ApiError.notFound('User not found');
    const isValid = await user.comparePassword(input.currentPassword);
    if (!isValid)
        throw ApiError_1.ApiError.unauthorized('Current password is incorrect');
    user.password = await (0, exports.hashPassword)(input.newPassword);
    // Invalidate all other sessions and all previously issued access tokens.
    user.passwordChangedAt = new Date();
    user.refreshTokens = [];
    await user.save();
};
exports.changePassword = changePassword;
/** Signs a token pair and records the hashed refresh token on the user. */
const issueSession = async (user) => {
    const accessToken = (0, jwt_1.generateAccessToken)(String(user._id), user.roles);
    const { token: refreshToken } = (0, jwt_1.generateRefreshToken)(String(user._id));
    const stored = {
        token: (0, jwt_1.hashToken)(refreshToken),
        expiresAt: (0, jwt_1.expiryFromToken)(refreshToken),
        createdAt: new Date(),
    };
    user.refreshTokens = (0, jwt_1.pruneRefreshTokens)([
        stored,
        ...user.refreshTokens.filter((entry) => !(0, jwt_1.isRefreshTokenExpired)(entry)),
    ]);
    await user.save();
    return { user: (0, models_1.toUserResponse)(user), accessToken, refreshToken };
};
/** Maps a stored user document to the request-scoped auth user. */
const toAuthUser = (user) => ({
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    roles: user.roles,
    avatarUrl: user.avatarUrl,
    status: user.status,
});
exports.toAuthUser = toAuthUser;
//# sourceMappingURL=auth.service.js.map