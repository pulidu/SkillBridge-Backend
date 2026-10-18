"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = require("./app");
const database_1 = require("./config/database");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
/**
 * Process entry point: connect to MongoDB, start listening, and shut down
 * cleanly on SIGINT/SIGTERM.
 */
const start = async () => {
    await (0, database_1.connectDatabase)();
    const server = app_1.app.listen(env_1.env.port, env_1.env.host, () => {
        logger_1.logger.info({ port: env_1.env.port, host: env_1.env.host, env: env_1.env.nodeEnv }, `SkillBridge LMS API listening on http://${env_1.env.host}:${env_1.env.port}/api/v1`);
    });
    const shutdown = (signal) => {
        logger_1.logger.info({ signal }, 'Shutting down gracefully');
        server.close(async () => {
            try {
                await (0, database_1.disconnectDatabase)();
            }
            catch (error) {
                logger_1.logger.error({ err: error }, 'Error while closing the database connection');
            }
            process.exit(0);
        });
        // Do not hang forever if a connection refuses to close.
        setTimeout(() => {
            logger_1.logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10_000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
        logger_1.logger.error({ reason }, 'Unhandled promise rejection');
    });
    process.on('uncaughtException', (error) => {
        logger_1.logger.fatal({ err: error }, 'Uncaught exception, exiting');
        void mongoose_1.default.connection.close().finally(() => process.exit(1));
    });
};
start().catch((error) => {
    logger_1.logger.fatal({ err: error }, 'Failed to start the server');
    process.exit(1);
});
//# sourceMappingURL=server.js.map