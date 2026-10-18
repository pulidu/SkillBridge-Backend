import { Router } from 'express';
import { enrollmentController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createEnrollmentSchema,
  enrollmentIdParamsSchema,
  lessonActionParamsSchema,
  listEnrollmentsSchema,
  progressEnrollmentParamsSchema,
  updateEnrollmentSchema,
} from '../validators/enrollment.validator';

const router = Router();

router.use(authenticate);

/* ------------------------- self-service (students) ------------------------- */
router.get(
  '/me',
  validate({ query: listEnrollmentsSchema }),
  enrollmentController.listMyEnrollments,
);

router.post(
  '/',
  authorize('student', 'admin'),
  validate({ body: createEnrollmentSchema }),
  enrollmentController.createEnrollment,
);

/* --------------------------- management (staff) ---------------------------- */
router.get(
  '/',
  authorize('admin', 'instructor'),
  validate({ query: listEnrollmentsSchema }),
  enrollmentController.listEnrollments,
);

router.get(
  '/:id',
  validate({ params: enrollmentIdParamsSchema }),
  enrollmentController.getEnrollment,
);

router.patch(
  '/:id',
  authorize('admin', 'instructor'),
  validate({ params: enrollmentIdParamsSchema, body: updateEnrollmentSchema }),
  enrollmentController.updateEnrollment,
);

router.delete(
  '/:id',
  validate({ params: enrollmentIdParamsSchema }),
  enrollmentController.cancelEnrollment,
);

/* ------------------------ progress (students only) ------------------------- */
const progressRouter = Router();
progressRouter.use(authenticate, authorize('student'));
progressRouter.get('/me', enrollmentController.getMyProgress);
progressRouter.get(
  '/enrollment/:enrollmentId',
  validate({ params: progressEnrollmentParamsSchema }),
  enrollmentController.getEnrollmentProgress,
);
progressRouter.post(
  '/lessons/:lessonId/complete',
  validate({ params: lessonActionParamsSchema }),
  enrollmentController.completeLesson,
);
progressRouter.post(
  '/lessons/:lessonId/incomplete',
  validate({ params: lessonActionParamsSchema }),
  enrollmentController.uncompleteLesson,
);

export { progressRouter };
export default router;
