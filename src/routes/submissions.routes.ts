import { Router } from 'express';
import { enrollmentController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createSubmissionSchema,
  gradeSubmissionSchema,
  listSubmissionsSchema,
  submissionIdParamsSchema,
} from '../validators/enrollment.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/me',
  validate({ query: listSubmissionsSchema }),
  enrollmentController.listMySubmissions,
);

router.post(
  '/',
  authorize('student'),
  validate({ body: createSubmissionSchema }),
  enrollmentController.createSubmission,
);

router.get(
  '/',
  authorize('admin', 'instructor'),
  validate({ query: listSubmissionsSchema }),
  enrollmentController.listSubmissions,
);

router.patch(
  '/:id/grade',
  authorize('admin', 'instructor'),
  validate({ params: submissionIdParamsSchema, body: gradeSubmissionSchema }),
  enrollmentController.gradeSubmission,
);

export default router;
