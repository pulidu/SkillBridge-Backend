import { Router } from 'express';
import { quizController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import { courseModuleParamsSchema } from '../validators/curriculum.validator';
import {
  attemptListQuerySchema,
  createQuizSchema,
  quizIdParamsSchema,
  submitAttemptSchema,
  updateQuizSchema,
} from '../validators/quiz.validator';

const router = Router();

router.use(authenticate);

/* Attempts are a student-only capability, and grading is server side. */
router.post(
  '/:id/attempts',
  authorize('student'),
  validate({ params: quizIdParamsSchema, body: submitAttemptSchema }),
  quizController.submitAttempt,
);
router.get(
  '/:id/attempts/me',
  authorize('student'),
  validate({ params: quizIdParamsSchema }),
  quizController.listMyAttempts,
);
router.get(
  '/:id/attempts',
  authorize('admin', 'instructor'),
  validate({ params: quizIdParamsSchema, query: attemptListQuerySchema }),
  quizController.listAllAttempts,
);

router.get('/:id', validate({ params: quizIdParamsSchema }), quizController.getQuiz);

router.patch(
  '/:id',
  authorize('admin', 'instructor'),
  validate({ params: quizIdParamsSchema, body: updateQuizSchema }),
  quizController.updateQuiz,
);
router.delete(
  '/:id',
  authorize('admin', 'instructor'),
  validate({ params: quizIdParamsSchema }),
  quizController.deleteQuiz,
);

/* Quizzes scoped to a course, mounted separately under /courses/:courseId. */
export const courseQuizRouter = Router();
courseQuizRouter.use(authenticate);
courseQuizRouter.get(
  '/',
  validate({ params: courseModuleParamsSchema }),
  quizController.listCourseQuizzes,
);
courseQuizRouter.post(
  '/',
  authorize('admin', 'instructor'),
  validate({ params: courseModuleParamsSchema, body: createQuizSchema }),
  quizController.createQuiz,
);

export default router;
