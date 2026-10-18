"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressRouter = void 0;
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const enrollment_validator_1 = require("../validators/enrollment.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/* ------------------------- self-service (students) ------------------------- */
router.get('/me', (0, validate_middleware_1.validate)({ query: enrollment_validator_1.listEnrollmentsSchema }), controllers_1.enrollmentController.listMyEnrollments);
router.post('/', (0, authorize_middleware_1.authorize)('student', 'admin'), (0, validate_middleware_1.validate)({ body: enrollment_validator_1.createEnrollmentSchema }), controllers_1.enrollmentController.createEnrollment);
/* --------------------------- management (staff) ---------------------------- */
router.get('/', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ query: enrollment_validator_1.listEnrollmentsSchema }), controllers_1.enrollmentController.listEnrollments);
router.get('/:id', (0, validate_middleware_1.validate)({ params: enrollment_validator_1.enrollmentIdParamsSchema }), controllers_1.enrollmentController.getEnrollment);
router.patch('/:id', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: enrollment_validator_1.enrollmentIdParamsSchema, body: enrollment_validator_1.updateEnrollmentSchema }), controllers_1.enrollmentController.updateEnrollment);
router.delete('/:id', (0, validate_middleware_1.validate)({ params: enrollment_validator_1.enrollmentIdParamsSchema }), controllers_1.enrollmentController.cancelEnrollment);
/* ------------------------ progress (students only) ------------------------- */
const progressRouter = (0, express_1.Router)();
exports.progressRouter = progressRouter;
progressRouter.use(auth_middleware_1.authenticate, (0, authorize_middleware_1.authorize)('student'));
progressRouter.get('/me', controllers_1.enrollmentController.getMyProgress);
progressRouter.get('/enrollment/:enrollmentId', (0, validate_middleware_1.validate)({ params: enrollment_validator_1.progressEnrollmentParamsSchema }), controllers_1.enrollmentController.getEnrollmentProgress);
progressRouter.post('/lessons/:lessonId/complete', (0, validate_middleware_1.validate)({ params: enrollment_validator_1.lessonActionParamsSchema }), controllers_1.enrollmentController.completeLesson);
progressRouter.post('/lessons/:lessonId/incomplete', (0, validate_middleware_1.validate)({ params: enrollment_validator_1.lessonActionParamsSchema }), controllers_1.enrollmentController.uncompleteLesson);
exports.default = router;
//# sourceMappingURL=enrollments.routes.js.map