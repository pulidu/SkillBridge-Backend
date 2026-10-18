"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_validator_1 = require("../validators/auth.validator");
const enrollment_validator_1 = require("../validators/enrollment.validator");
const router = (0, express_1.Router)();
/* Everything in users.routes.ts requires an authenticated user. */
router.use(auth_middleware_1.authenticate);
/* /users/me/enrollments */
const enrollmentRouter = (0, express_1.Router)();
enrollmentRouter.get('/', (0, validate_middleware_1.validate)({ query: enrollment_validator_1.listEnrollmentsSchema }), controllers_1.enrollmentController.listMyEnrollments);
router.use('/me/enrollments', enrollmentRouter);
/* /users/me/certificates */
const certificateRouter = (0, express_1.Router)();
certificateRouter.get('/', controllers_1.enrollmentController.listMyCertificates);
certificateRouter.get('/verify/:serialNumber', (0, validate_middleware_1.validate)({ params: enrollment_validator_1.certificateSerialParamsSchema }), controllers_1.enrollmentController.verifyCertificate);
certificateRouter.patch('/:id/revoke', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ params: auth_validator_1.idParamSchema }), controllers_1.enrollmentController.revokeCertificate);
router.use('/me/certificates', certificateRouter);
/* /users/me/notifications */
const notificationRouter = (0, express_1.Router)();
notificationRouter.get('/', (0, validate_middleware_1.validate)({ query: enrollment_validator_1.listNotificationsSchema }), controllers_1.dashboardController.listNotifications);
notificationRouter.get('/unread-count', controllers_1.dashboardController.unreadCount);
notificationRouter.patch('/read-all', controllers_1.dashboardController.markAllAsRead);
notificationRouter.patch('/:id/read', (0, validate_middleware_1.validate)({ params: enrollment_validator_1.notificationIdParamsSchema }), controllers_1.dashboardController.markAsRead);
notificationRouter.delete('/:id', (0, validate_middleware_1.validate)({ params: enrollment_validator_1.notificationIdParamsSchema }), controllers_1.dashboardController.deleteNotification);
router.use('/me/notifications', notificationRouter);
/* /users/audit-logs (admin only) */
const auditRouter = (0, express_1.Router)();
auditRouter.get('/', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ query: enrollment_validator_1.listAuditLogsSchema }), controllers_1.dashboardController.listAuditLogs);
router.use('/audit-logs', auditRouter);
/* Current user, any role. */
router.get('/me', controllers_1.userController.getMyProfile);
/* Administration. Ownership of `/:id` routes is enforced in the service. */
router.get('/', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ query: auth_validator_1.listUsersSchema }), controllers_1.userController.listUsers);
/* Admin-only: the only way to mint an instructor account. */
router.post('/', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ body: auth_validator_1.createUserSchema }), controllers_1.userController.createUser);
router.get('/:id', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: auth_validator_1.idParamSchema }), controllers_1.userController.getUser);
router.patch('/:id', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ params: auth_validator_1.idParamSchema, body: auth_validator_1.updateUserSchema }), controllers_1.userController.updateUser);
router.patch('/:id/role', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ params: auth_validator_1.idParamSchema, body: auth_validator_1.updateRoleSchema }), controllers_1.userController.updateUserRole);
router.patch('/:id/status', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ params: auth_validator_1.idParamSchema, body: auth_validator_1.updateStatusSchema }), controllers_1.userController.updateUserStatus);
router.delete('/:id', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ params: auth_validator_1.idParamSchema }), controllers_1.userController.deleteUser);
exports.default = router;
//# sourceMappingURL=users.routes.js.map