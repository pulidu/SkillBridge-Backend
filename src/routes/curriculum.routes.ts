import { Router } from 'express';
import { curriculumController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createLessonSchema,
  createModuleSchema,
  curriculumQuerySchema,
  courseLessonParamsSchema,
  courseModuleIdParamsSchema,
  courseModuleParamsSchema,
  updateLessonSchema,
  updateModuleSchema,
} from '../validators/curriculum.validator';

const router = Router();

router.use(authenticate);

/* Read the course curriculum. The service decides what the caller may see. */
router.get(
  '/:courseId/curriculum',
  validate({ params: courseModuleParamsSchema, query: curriculumQuerySchema }),
  curriculumController.getCurriculum,
);

/* --------------------------------- modules --------------------------------- */
router.get(
  '/:courseId/modules',
  validate({ params: courseModuleParamsSchema }),
  curriculumController.listModules,
);
router.post(
  '/:courseId/modules',
  authorize('admin', 'instructor'),
  validate({ params: courseModuleParamsSchema, body: createModuleSchema }),
  curriculumController.createModule,
);
router.patch(
  '/:courseId/modules/:moduleId',
  authorize('admin', 'instructor'),
  validate({ params: courseModuleIdParamsSchema, body: updateModuleSchema }),
  curriculumController.updateModule,
);
router.delete(
  '/:courseId/modules/:moduleId',
  authorize('admin', 'instructor'),
  validate({ params: courseModuleIdParamsSchema }),
  curriculumController.deleteModule,
);

/* --------------------------------- lessons --------------------------------- */
router.get(
  '/:courseId/lessons',
  validate({ params: courseModuleParamsSchema }),
  curriculumController.listLessons,
);
router.post(
  '/:courseId/lessons',
  authorize('admin', 'instructor'),
  validate({ params: courseModuleParamsSchema, body: createLessonSchema }),
  curriculumController.createLesson,
);
router.get(
  '/:courseId/lessons/:lessonId',
  validate({ params: courseLessonParamsSchema }),
  curriculumController.getLesson,
);
router.patch(
  '/:courseId/lessons/:lessonId',
  authorize('admin', 'instructor'),
  validate({ params: courseLessonParamsSchema, body: updateLessonSchema }),
  curriculumController.updateLesson,
);
router.delete(
  '/:courseId/lessons/:lessonId',
  authorize('admin', 'instructor'),
  validate({ params: courseLessonParamsSchema }),
  curriculumController.deleteLesson,
);

export default router;
