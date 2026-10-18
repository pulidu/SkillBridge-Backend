"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
/**
 * Wraps an async route handler so a rejected promise is forwarded to Express's
 * error pipeline instead of becoming an unhandled rejection.
 */
const asyncHandler = (handler) => (req, res, next) => {
    handler(req, res, next).catch(next);
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=asyncHandler.js.map