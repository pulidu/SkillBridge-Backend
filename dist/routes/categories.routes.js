"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_validator_1 = require("../validators/auth.validator");
const curriculum_validator_1 = require("../validators/curriculum.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', controllers_1.curriculumController.listCategories);
router.get('/counts', controllers_1.curriculumController.listCategoriesWithCounts);
router.get('/:id', (0, validate_middleware_1.validate)({ params: auth_validator_1.idParamSchema }), controllers_1.curriculumController.getCategory);
/* Category management is an administrative responsibility. */
router.post('/', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ body: curriculum_validator_1.createCategorySchema }), controllers_1.curriculumController.createCategory);
router.patch('/:id', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ params: auth_validator_1.idParamSchema, body: curriculum_validator_1.updateCategorySchema }), controllers_1.curriculumController.updateCategory);
router.delete('/:id', (0, authorize_middleware_1.authorize)('admin'), (0, validate_middleware_1.validate)({ params: auth_validator_1.idParamSchema }), controllers_1.curriculumController.deleteCategory);
exports.default = router;
//# sourceMappingURL=categories.routes.js.map