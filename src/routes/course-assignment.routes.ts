import { Router } from 'express';
import { assignmentController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  courseAssignmentParamsSchema,
  createAssignmentSchema,
  listAssignmentsQuerySchema,
} from '../validators/assignment.validator';

/**
 * Assignments are addressed in two ways:
 *   - nested under the course that owns them  -> /api/v1/courses/:courseId/assignments
 *   - directly by id                         -> /api/v1/assignments/:assignmentId
 */
const router = Router();

router.use(authenticate);

/* ------------------------------- course scoped ----------------------------- */

// Reads are open to any authenticated caller: the service hides unpublished
// work from anyone who does not own the course.
router.get(
  '/:courseId/assignments',
  validate({ params: courseAssignmentParamsSchema, query: listAssignmentsQuerySchema }),
  assignmentController.listAssignments,
);

router.post(
  '/:courseId/assignments',
  authorize('admin', 'instructor'),
  validate({ params: courseAssignmentParamsSchema, body: createAssignmentSchema }),
  assignmentController.createAssignment,
);

export default router;