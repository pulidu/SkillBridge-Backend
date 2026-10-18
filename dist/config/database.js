"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseHealth = exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const logger_1 = require("./logger");
mongoose_1.default.set('strictQuery', true);
mongoose_1.default.set('sanitizeFilter', true);
const connectDatabase = async () => {
    mongoose_1.default.connection.on('connected', () => {
        logger_1.logger.info('MongoDB connected');
    });
    mongoose_1.default.connection.on('error', (error) => {
        logger_1.logger.error({ err: error }, 'MongoDB connection error');
    });
    mongoose_1.default.connection.on('disconnected', () => {
        logger_1.logger.warn('MongoDB disconnected');
    });
    try {
        return await mongoose_1.default.connect(env_1.env.mongoUri, {
            serverSelectionTimeoutMS: 10_000,
            autoIndex: !env_1.env.isProduction,
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to connect to MongoDB');
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    await mongoose_1.default.connection.close();
    logger_1.logger.info('MongoDB connection closed');
};
exports.disconnectDatabase = disconnectDatabase;
const databaseHealth = async () => {
    const readyState = mongoose_1.default.connection.readyState;
    return { connected: readyState === 1, readyState };
};
exports.databaseHealth = databaseHealth;
//# sourceMappingURL=database.js.map