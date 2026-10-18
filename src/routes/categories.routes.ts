import { Router } from 'express';
import { curriculumController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/auth.validator';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/curriculum.validator';

const router = Router();

router.use(authenticate);

router.get('/', curriculumController.listCategories);
router.get('/counts', curriculumController.listCategoriesWithCounts);
router.get('/:id', validate({ params: idParamSchema }), curriculumController.getCategory);

/* Category management is an administrative responsibility. */
router.post(
  '/',
  authorize('admin'),
  validate({ body: createCategorySchema }),
  curriculumController.createCategory,
);
router.patch(
  '/:id',
  authorize('admin'),
  validate({ params: idParamSchema, body: updateCategorySchema }),
  curriculumController.updateCategory,
);
router.delete(
  '/:id',
  authorize('admin'),
  validate({ params: idParamSchema }),
  curriculumController.deleteCategory,
);

export default router;
