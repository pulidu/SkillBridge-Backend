import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/auth.validator';

const router = Router();

/* Public. Credential endpoints are rate limited to slow down brute force. */
router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

/* Authenticated. */
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), authController.updateProfile);
router.patch(
  '/password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

export default router;
