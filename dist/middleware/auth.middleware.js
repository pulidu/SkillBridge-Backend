"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticate = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const asyncHandler_1 = require("../utils/asyncHandler");
const jwt_1 = require("../utils/jwt");
/**
 * Verifies the access token, loads the user and attaches them to the request.
 *
 * Rejects: missing token (401), invalid/expired token (401), unknown user (401),
 * suspended account (403). Also enforces that a password change invalidates
 * tokens issued before it.
 */
exports.authenticate = (0, asyncHandler_1.asyncHandler)(async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        throw ApiError_1.ApiError.unauthorized('Authentication token is missing');
    }
    const token = header.slice(7).trim();
    const payload = (0, jwt_1.verifyAccessToken)(token);
    // `isDeleted: false` matters: a soft-deleted account's access tokens would
    // otherwise keep working until they expired.
    const user = await models_1.User.findOne({ _id: payload.sub, isDeleted: false }).select('fullName email roles avatarUrl status passwordChangedAt');
    if (!user)
        throw ApiError_1.ApiError.unauthorized('Account no longer exists');
    if (user.status === 'suspended')
        throw ApiError_1.ApiError.forbidden('This account has been suspended');
    const tokenIssuedAt = payload.iat ? payload.iat * 1000 : 0;
    if (user.passwordChangedAt && tokenIssuedAt < user.passwordChangedAt.getTime() - 1000) {
        throw ApiError_1.ApiError.unauthorized('Session is no longer valid, please sign in again');
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
exports.optionalAuth = (0, asyncHandler_1.asyncHandler)(async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
        return next();
    try {
        const payload = (0, jwt_1.verifyAccessToken)(header.slice(7).trim());
        const user = await models_1.User.findOne({ _id: payload.sub, isDeleted: false }).select('fullName email roles avatarUrl status');
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
    }
    catch {
        // Ignore: the route treats the request as anonymous.
    }
    return next();
});
//# sourceMappingURL=auth.middleware.js.map