"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRefreshTokenExpired = exports.pruneRefreshTokens = exports.verifyRefreshToken = exports.verifyAccessToken = exports.expiryFromToken = exports.hashToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const constants_1 = require("../constants");
const ApiError_1 = require("./ApiError");
const sign = (payload, secret, expiresIn) => jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
const generateAccessToken = (userId, roles) => sign({ sub: userId, roles, type: 'access' }, env_1.env.jwt.accessSecret, env_1.env.jwt.accessExpiresIn);
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (userId) => {
    const jti = node_crypto_1.default.randomUUID();
    const token = sign({ sub: userId, jti, type: 'refresh' }, env_1.env.jwt.refreshSecret, env_1.env.jwt.refreshExpiresIn);
    return { token, jti };
};
exports.generateRefreshToken = generateRefreshToken;
/** SHA-256 hex digest. Only hashes of refresh tokens are ever persisted. */
const hashToken = (token) => node_crypto_1.default.createHash('sha256').update(token).digest('hex');
exports.hashToken = hashToken;
/** Derives the absolute expiry date from a JWT so it can be stored on the user. */
const expiryFromToken = (token) => {
    const decoded = jsonwebtoken_1.default.decode(token);
    if (decoded && typeof decoded === 'object' && typeof decoded.exp === 'number') {
        return new Date(decoded.exp * 1000);
    }
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};
exports.expiryFromToken = expiryFromToken;
const verifyAccessToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwt.accessSecret);
        if (decoded.type !== 'access')
            throw ApiError_1.ApiError.unauthorized('Invalid token type');
        return decoded;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        throw ApiError_1.ApiError.unauthorized('Invalid or expired access token');
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwt.refreshSecret);
        if (decoded.type !== 'refresh')
            throw ApiError_1.ApiError.unauthorized('Invalid token type');
        return decoded;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        throw ApiError_1.ApiError.unauthorized('Invalid or expired refresh token');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
/** Trims the token list to the newest N entries. */
const pruneRefreshTokens = (tokens) => tokens.slice(0, constants_1.REFRESH_TOKEN.MAX_PER_USER);
exports.pruneRefreshTokens = pruneRefreshTokens;
const isRefreshTokenExpired = (record) => record.expiresAt.getTime() <= Date.now();
exports.isRefreshTokenExpired = isRefreshTokenExpired;
//# sourceMappingURL=jwt.js.map