import { Router } from 'express';
import { dashboardController, healthController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();

/* ---------------------------------- health --------------------------------- */
router.get('/health', healthController.health);
router.get('/health/db', healthController.healthWithDatabase);

/* -------------------------------- dashboard -------------------------------- */
router.get('/dashboard/student', authenticate, authorize('student'), dashboardController.studentDashboard);
router.get(
  '/dashboard/instructor',
  authenticate,
  authorize('instructor', 'admin'),
  dashboardController.instructorDashboard,
);
router.get('/dashboard/admin', authenticate, authorize('admin'), dashboardController.adminDashboard);

export default router;
