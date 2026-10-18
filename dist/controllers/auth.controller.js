"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateProfile = exports.me = exports.logout = exports.refresh = exports.login = exports.register = void 0;
const env_1 = require("../config/env");
const constants_1 = require("../constants");
const authService = __importStar(require("../services/auth.service"));
const ApiError_1 = require("../utils/ApiError");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
/** Cookie options shared by every refresh-cookie write. */
const refreshCookieOptions = () => ({
    httpOnly: true,
    secure: env_1.env.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    ...(env_1.env.cookieDomain ? { domain: env_1.env.cookieDomain } : {}),
});
const readRefreshCookie = (req) => req.cookies?.[constants_1.REFRESH_TOKEN.COOKIE_NAME];
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await authService.registerUser(req.body);
    res.cookie(constants_1.REFRESH_TOKEN.COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    return (0, response_1.sendCreated)(res, { user: result.user, accessToken: result.accessToken });
});
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await authService.loginUser(req.body);
    res.cookie(constants_1.REFRESH_TOKEN.COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    return (0, response_1.sendSuccess)(res, { user: result.user, accessToken: result.accessToken });
});
/** Rotates the refresh cookie and returns a new access token. */
exports.refresh = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const token = readRefreshCookie(req);
    if (!token)
        throw ApiError_1.ApiError.unauthorized('No refresh token provided');
    const result = await authService.refreshSession(token);
    res.cookie(constants_1.REFRESH_TOKEN.COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    return (0, response_1.sendSuccess)(res, { user: result.user, accessToken: result.accessToken });
});
exports.logout = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const token = readRefreshCookie(req);
    if (token)
        await authService.revokeRefreshToken(token);
    res.clearCookie(constants_1.REFRESH_TOKEN.COOKIE_NAME, { ...refreshCookieOptions(), maxAge: undefined });
    return (0, response_1.sendSuccess)(res, { message: 'Signed out' });
});
exports.me = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const profile = await authService.getProfile(user.id);
    return (0, response_1.sendSuccess)(res, profile);
});
exports.updateProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const profile = await authService.updateOwnProfile(user.id, req.body);
    return (0, response_1.sendSuccess)(res, profile);
});
exports.changePassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const input = req.body;
    await authService.changePassword(user.id, input);
    res.clearCookie(constants_1.REFRESH_TOKEN.COOKIE_NAME, { ...refreshCookieOptions(), maxAge: undefined });
    return (0, response_1.sendSuccess)(res, { message: 'Password updated, please sign in again' });
});
//# sourceMappingURL=auth.controller.js.map