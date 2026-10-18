import { Router } from 'express';
import { assignmentController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  assignmentIdParamsSchema,
  updateAssignmentSchema,
} from '../validators/assignment.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/:assignmentId',
  validate({ params: assignmentIdParamsSchema }),
  assignmentController.getAssignment,
);

router.patch(
  '/:assignmentId',
  authorize('admin', 'instructor'),
  validate({ params: assignmentIdParamsSchema, body: updateAssignmentSchema }),
  assignmentController.updateAssignment,
);

router.delete(
  '/:assignmentId',
  authorize('admin', 'instructor'),
  validate({ params: assignmentIdParamsSchema }),
  assignmentController.deleteAssignment,
);

export default router;