"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = void 0;
const env_1 = require("./env");
/**
 * CORS configuration driven by the CORS_ORIGINS allow-list.
 * Credentials are enabled so the httpOnly refresh cookie is sent.
 */
exports.corsOptions = {
    origin(origin, callback) {
        // Same-origin, curl and server-to-server requests have no Origin header.
        if (!origin)
            return callback(null, true);
        if (env_1.env.corsOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86_400,
    optionsSuccessStatus: 204,
};
//# sourceMappingURL=cors.js.map