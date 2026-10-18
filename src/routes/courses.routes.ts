import { Router } from 'express';
import { courseController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  assignInstructorSchema,
  createCourseSchema,
  courseParamsSchema,
  courseSlugParamsSchema,
  createRatingSchema,
  listCoursesSchema,
  rosterQuerySchema,
  updateCourseSchema,
} from '../validators/course.validator';

const router = Router();

/* Public: featured courses power the landing page for anonymous visitors.
   Registered before `authenticate` so it stays readable without a session,
   while the service still exposes published, non-deleted courses only. */
router.get('/featured', courseController.listFeaturedCourses);

router.use(authenticate);

/* Collection reads, available to every authenticated role. Students only
   ever see published courses - the service applies that filter. */
router.get('/', validate({ query: listCoursesSchema }), courseController.listCourses);

/* Creation is limited to instructors and admins. */
router.post(
  '/',
  authorize('admin', 'instructor'),
  validate({ body: createCourseSchema }),
  courseController.createCourse,
);

/* Read a course by slug. Registered before `/:id` so "slug" is never treated
   as an identifier. */
router.get(
  '/slug/:slug',
  validate({ params: courseSlugParamsSchema }),
  courseController.getCourseBySlug,
);

router.get('/:id', validate({ params: courseParamsSchema }), courseController.getCourse);

/* Mutations require ownership, asserted in the service layer. */
router.patch(
  '/:id',
  authorize('admin', 'instructor'),
  validate({ params: courseParamsSchema, body: updateCourseSchema }),
  courseController.updateCourse,
);
router.delete(
  '/:id',
  authorize('admin', 'instructor'),
  validate({ params: courseParamsSchema }),
  courseController.deleteCourse,
);

/* Reassigning the owner is an administrative act, so it is admin only and has
   its own endpoint rather than riding along on the general content PATCH. */
router.patch(
  '/:id/instructor',
  authorize('admin'),
  validate({ params: courseParamsSchema, body: assignInstructorSchema }),
  courseController.assignCourseInstructor,
);

router.patch(
  '/:id/publish',
  authorize('admin', 'instructor'),
  validate({ params: courseParamsSchema }),
  courseController.publishCourse,
);
router.patch(
  '/:id/unpublish',
  authorize('admin', 'instructor'),
  validate({ params: courseParamsSchema }),
  courseController.unpublishCourse,
);
router.patch(
  '/:id/archive',
  authorize('admin', 'instructor'),
  validate({ params: courseParamsSchema }),
  courseController.archiveCourse,
);

router.get(
  '/:id/analytics',
  authorize('admin', 'instructor'),
  validate({ params: courseParamsSchema }),
  courseController.getCourseAnalytics,
);
router.get(
  '/:id/students',
  authorize('admin', 'instructor'),
  validate({ params: courseParamsSchema, query: rosterQuerySchema }),
  courseController.getCourseStudents,
);

router.post(
  '/:id/ratings',
  validate({ params: courseParamsSchema, body: createRatingSchema }),
  courseController.rateCourse,
);
router.get('/:id/ratings', validate({ params: courseParamsSchema }), courseController.listCourseRatings);

export default router;
