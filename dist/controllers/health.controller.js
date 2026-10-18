"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthWithDatabase = exports.health = void 0;
const env_1 = require("../config/env");
const database_1 = require("../config/database");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
exports.health = (0, asyncHandler_1.asyncHandler)(async (_req, res) => (0, response_1.sendSuccess)(res, {
    status: 'ok',
    service: 'skillbridge-lms-api',
    environment: env_1.env.nodeEnv,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
}));
exports.healthWithDatabase = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const database = await (0, database_1.databaseHealth)();
    return (0, response_1.sendSuccess)(res, {
        status: database.connected ? 'ok' : 'degraded',
        database,
        timestamp: new Date().toISOString(),
    }, database.connected ? 200 : 503);
});
//# sourceMappingURL=health.controller.js.map