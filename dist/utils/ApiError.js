"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
/**
 * Operational error with an HTTP status code. Anything thrown that is not an
 * ApiError is treated as an unexpected 500 by the error handler.
 */
class ApiError extends Error {
    statusCode;
    errors;
    isOperational = true;
    constructor(statusCode, message, errors) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        if (errors)
            this.errors = errors;
        Error.captureStackTrace(this, ApiError);
    }
    static badRequest(message = 'Bad request', errors) {
        return new ApiError(400, message, errors);
    }
    static unauthorized(message = 'Authentication required') {
        return new ApiError(401, message);
    }
    static forbidden(message = 'You do not have permission to perform this action') {
        return new ApiError(403, message);
    }
    static notFound(message = 'Resource not found') {
        return new ApiError(404, message);
    }
    static conflict(message = 'Resource already exists') {
        return new ApiError(409, message);
    }
    static unprocessable(message = 'Validation failed', errors) {
        return new ApiError(422, message, errors);
    }
    static internal(message = 'Internal server error') {
        return new ApiError(500, message);
    }
}
exports.ApiError = ApiError;
//# sourceMappingURL=ApiError.js.map