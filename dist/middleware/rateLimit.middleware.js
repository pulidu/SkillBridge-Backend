"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
const handler = (message) => (_req, res) => {
    res.status(429).json({ success: false, message });
};
const shared = {
    standardHeaders: true,
    legacyHeaders: false,
};
/** Broad limiter applied to the whole API surface. */
exports.apiLimiter = (0, express_rate_limit_1.default)({
    ...shared,
    windowMs: env_1.env.rateLimit.windowMs,
    max: env_1.env.rateLimit.max,
    handler: handler('Too many requests, please try again later'),
});
/** Stricter limiter for credential endpoints to slow down brute force. */
exports.authLimiter = (0, express_rate_limit_1.default)({
    ...shared,
    windowMs: env_1.env.rateLimit.windowMs,
    max: env_1.env.rateLimit.authMax,
    skipSuccessfulRequests: true,
    handler: handler('Too many authentication attempts, please try again later'),
});
//# sourceMappingURL=rateLimit.middleware.js.map