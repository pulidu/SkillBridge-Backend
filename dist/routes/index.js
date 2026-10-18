"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const router = (0, express_1.Router)();
/* ---------------------------------- health --------------------------------- */
router.get('/health', controllers_1.healthController.health);
router.get('/health/db', controllers_1.healthController.healthWithDatabase);
/* -------------------------------- dashboard -------------------------------- */
router.get('/dashboard/student', auth_middleware_1.authenticate, (0, authorize_middleware_1.authorize)('student'), controllers_1.dashboardController.studentDashboard);
router.get('/dashboard/instructor', auth_middleware_1.authenticate, (0, authorize_middleware_1.authorize)('instructor', 'admin'), controllers_1.dashboardController.instructorDashboard);
router.get('/dashboard/admin', auth_middleware_1.authenticate, (0, authorize_middleware_1.authorize)('admin'), controllers_1.dashboardController.adminDashboard);
exports.default = router;
//# sourceMappingURL=index.js.map