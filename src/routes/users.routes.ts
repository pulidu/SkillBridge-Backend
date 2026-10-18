import { Router } from 'express';
import { dashboardController, enrollmentController, userController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createUserSchema,
  idParamSchema,
  listUsersSchema,
  updateRoleSchema,
  updateStatusSchema,
  updateUserSchema,
} from '../validators/auth.validator';
import {
  certificateSerialParamsSchema,
  listAuditLogsSchema,
  listEnrollmentsSchema,
  listNotificationsSchema,
  notificationIdParamsSchema,
} from '../validators/enrollment.validator';

const router = Router();

/* Everything in users.routes.ts requires an authenticated user. */
router.use(authenticate);

/* /users/me/enrollments */
const enrollmentRouter = Router();
enrollmentRouter.get('/', validate({ query: listEnrollmentsSchema }), enrollmentController.listMyEnrollments);
router.use('/me/enrollments', enrollmentRouter);

/* /users/me/certificates */
const certificateRouter = Router();
certificateRouter.get('/', enrollmentController.listMyCertificates);
certificateRouter.get(
  '/verify/:serialNumber',
  validate({ params: certificateSerialParamsSchema }),
  enrollmentController.verifyCertificate,
);
certificateRouter.patch(
  '/:id/revoke',
  authorize('admin'),
  validate({ params: idParamSchema }),
  enrollmentController.revokeCertificate,
);
router.use('/me/certificates', certificateRouter);

/* /users/me/notifications */
const notificationRouter = Router();
notificationRouter.get('/', validate({ query: listNotificationsSchema }), dashboardController.listNotifications);
notificationRouter.get('/unread-count', dashboardController.unreadCount);
notificationRouter.patch('/read-all', dashboardController.markAllAsRead);
notificationRouter.patch(
  '/:id/read',
  validate({ params: notificationIdParamsSchema }),
  dashboardController.markAsRead,
);
notificationRouter.delete(
  '/:id',
  validate({ params: notificationIdParamsSchema }),
  dashboardController.deleteNotification,
);
router.use('/me/notifications', notificationRouter);

/* /users/audit-logs (admin only) */
const auditRouter = Router();
auditRouter.get('/', authorize('admin'), validate({ query: listAuditLogsSchema }), dashboardController.listAuditLogs);
router.use('/audit-logs', auditRouter);

/* Current user, any role. */
router.get('/me', userController.getMyProfile);

/* Administration. Ownership of `/:id` routes is enforced in the service. */
router.get('/', authorize('admin'), validate({ query: listUsersSchema }), userController.listUsers);
/* Admin-only: the only way to mint an instructor account. */
router.post(
  '/',
  authorize('admin'),
  validate({ body: createUserSchema }),
  userController.createUser,
);
router.get('/:id', authorize('admin', 'instructor'), validate({ params: idParamSchema }), userController.getUser);
router.patch(
  '/:id',
  authorize('admin'),
  validate({ params: idParamSchema, body: updateUserSchema }),
  userController.updateUser,
);
router.patch(
  '/:id/role',
  authorize('admin'),
  validate({ params: idParamSchema, body: updateRoleSchema }),
  userController.updateUserRole,
);
router.patch(
  '/:id/status',
  authorize('admin'),
  validate({ params: idParamSchema, body: updateStatusSchema }),
  userController.updateUserStatus,
);
router.delete('/:id', authorize('admin'), validate({ params: idParamSchema }), userController.deleteUser);

export default router;
