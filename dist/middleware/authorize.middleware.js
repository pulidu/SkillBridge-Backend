"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const ApiError_1 = require("../utils/ApiError");
/**
 * Coarse role gate. Must run after `authenticate`.
 *
 * Resource-level ownership (does this instructor own this course?) is NOT
 * checked here - it is asserted in the service layer.
 */
const authorize = (...allowed) => (req, _res, next) => {
    if (!req.user)
        return next(ApiError_1.ApiError.unauthorized('Authentication required'));
    const permitted = req.user.roles.some((role) => allowed.includes(role));
    if (!permitted) {
        return next(ApiError_1.ApiError.forbidden(`This action requires one of the following roles: ${allowed.join(', ')}`));
    }
    return next();
};
exports.authorize = authorize;
//# sourceMappingURL=authorize.middleware.js.map