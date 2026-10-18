"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_validator_1 = require("../validators/auth.validator");
const router = (0, express_1.Router)();
/* Public. Credential endpoints are rate limited to slow down brute force. */
router.post('/register', rateLimit_middleware_1.authLimiter, (0, validate_middleware_1.validate)({ body: auth_validator_1.registerSchema }), controllers_1.authController.register);
router.post('/login', rateLimit_middleware_1.authLimiter, (0, validate_middleware_1.validate)({ body: auth_validator_1.loginSchema }), controllers_1.authController.login);
router.post('/refresh', controllers_1.authController.refresh);
router.post('/logout', controllers_1.authController.logout);
/* Authenticated. */
router.get('/me', auth_middleware_1.authenticate, controllers_1.authController.me);
router.patch('/me', auth_middleware_1.authenticate, (0, validate_middleware_1.validate)({ body: auth_validator_1.updateProfileSchema }), controllers_1.authController.updateProfile);
router.patch('/password', auth_middleware_1.authenticate, (0, validate_middleware_1.validate)({ body: auth_validator_1.changePasswordSchema }), controllers_1.authController.changePassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map