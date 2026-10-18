"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = void 0;
const mongoose_1 = require("mongoose");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const ApiError_1 = require("../utils/ApiError");
/** Terminal 404 handler for unmatched routes. */
const notFound = (req, _res, next) => {
    next(ApiError_1.ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
exports.notFound = notFound;
/**
 * Global error handler. Registered last and must keep its 4-parameter
 * signature for Express to recognise it.
 */
const errorHandler = (error, req, res, _next) => {
    let statusCode = 500;
    let message = 'Internal server error';
    let errors;
    if (error instanceof ApiError_1.ApiError) {
        statusCode = error.statusCode;
        message = error.message;
        errors = error.errors;
    }
    else if (error instanceof zod_1.ZodError) {
        statusCode = 422;
        message = 'Validation failed';
        errors = error.issues.map((issue) => ({
            field: issue.path.join('.') || '(root)',
            message: issue.message,
        }));
    }
    else if (error instanceof mongoose_1.Error.ValidationError) {
        statusCode = 422;
        message = 'Validation failed';
        errors = Object.values(error.errors).map((item) => ({
            field: item.path,
            message: item.message,
        }));
    }
    else if (error instanceof mongoose_1.Error.CastError) {
        statusCode = 400;
        message = `Invalid value for "${error.path}"`;
    }
    else if (isDuplicateKeyError(error)) {
        statusCode = 409;
        const field = extractDuplicateField(error);
        message = field ? `A record with that ${field} already exists` : 'Duplicate record';
    }
    else if (error instanceof SyntaxError && 'body' in error) {
        statusCode = 400;
        message = 'Malformed JSON in request body';
    }
    else if (error instanceof Error) {
        message = env_1.env.isProduction ? 'Internal server error' : error.message;
    }
    if (statusCode >= 500) {
        logger_1.logger.error({ err: error, method: req.method, url: req.originalUrl }, 'Unhandled error');
    }
    else {
        logger_1.logger.warn({ statusCode, method: req.method, url: req.originalUrl, message }, 'Request rejected');
    }
    const body = {
        success: false,
        message,
        ...(errors ? { errors } : {}),
    };
    if (!env_1.env.isProduction && statusCode >= 500) {
        body.stack = error instanceof Error ? error.stack : undefined;
    }
    res.status(statusCode).json(body);
};
exports.errorHandler = errorHandler;
const isDuplicateKeyError = (error) => typeof error === 'object' &&
    error !== null &&
    error.code === 11000;
const extractDuplicateField = (error) => {
    if (typeof error !== 'object' || error === null)
        return undefined;
    const keyPattern = error.keyPattern;
    if (!keyPattern)
        return undefined;
    return Object.keys(keyPattern)[0];
};
//# sourceMappingURL=error.middleware.js.map