"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerConfig = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const env_1 = require("./env");
/**
 * Application logger. Secrets are redacted so they can never reach a log sink.
 */
exports.logger = (0, pino_1.default)({
    level: env_1.env.logLevel,
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            'password',
            '*.password',
            'token',
            '*.token',
            'refreshToken',
            '*.refreshToken',
        ],
        censor: '[redacted]',
    },
    ...(env_1.env.logPretty && !env_1.env.isProduction
        ? {
            transport: {
                target: 'pino/file',
                options: { destination: 1 },
            },
        }
        : {}),
});
exports.loggerConfig = {
    logger: exports.logger,
    autoLogging: {
        ignore: (req) => Boolean(req.url?.startsWith('/api/v1/health')),
    },
};
//# sourceMappingURL=logger.js.map