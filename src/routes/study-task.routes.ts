import { Router } from 'express';
import { studyTaskController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createStudyTaskBodySchema,
  listStudyTasksQuerySchema,
  taskIdParamsSchema,
  updateStudyTaskBodySchema,
} from '../validators/study-task.validator';

const router = Router();

// All study planner routes require authentication
router.use(authenticate);

/* ----------------------------- Analytics endpoints ---------------------------- */
router.get(
  '/admin/analytics',
  authorize('admin'),
  studyTaskController.getAdminPlannerStats,
);

router.get(
  '/instructor/analytics',
  authorize('instructor'),
  studyTaskController.getInstructorPlannerStats,
);

/* ----------------------------- Student endpoints ------------------------------ */
router.get(
  '/stats',
  authorize('student'),
  studyTaskController.getStudentPlannerStats,
);

router.get(
  '/weekly',
  authorize('student'),
  studyTaskController.getWeeklySchedule,
);

router.post(
  '/suggestions',
  authorize('student'),
  studyTaskController.generateSuggestions,
);

router.get(
  '/tasks',
  authorize('student'),
  validate({ query: listStudyTasksQuerySchema }),
  studyTaskController.listTasks,
);

router.post(
  '/tasks',
  authorize('student'),
  validate({ body: createStudyTaskBodySchema }),
  studyTaskController.createTask,
);

router.get(
  '/tasks/:id',
  authorize('student'),
  validate({ params: taskIdParamsSchema }),
  studyTaskController.getTaskById,
);

router.patch(
  '/tasks/:id',
  authorize('student'),
  validate({ params: taskIdParamsSchema, body: updateStudyTaskBodySchema }),
  studyTaskController.updateTask,
);

router.delete(
  '/tasks/:id',
  authorize('student'),
  validate({ params: taskIdParamsSchema }),
  studyTaskController.deleteTask,
);

export default router;
