"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const curriculum_validator_1 = require("../validators/curriculum.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/* Read the course curriculum. The service decides what the caller may see. */
router.get('/:courseId/curriculum', (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseModuleParamsSchema, query: curriculum_validator_1.curriculumQuerySchema }), controllers_1.curriculumController.getCurriculum);
/* --------------------------------- modules --------------------------------- */
router.get('/:courseId/modules', (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseModuleParamsSchema }), controllers_1.curriculumController.listModules);
router.post('/:courseId/modules', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseModuleParamsSchema, body: curriculum_validator_1.createModuleSchema }), controllers_1.curriculumController.createModule);
router.patch('/:courseId/modules/:moduleId', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseModuleIdParamsSchema, body: curriculum_validator_1.updateModuleSchema }), controllers_1.curriculumController.updateModule);
router.delete('/:courseId/modules/:moduleId', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseModuleIdParamsSchema }), controllers_1.curriculumController.deleteModule);
/* --------------------------------- lessons --------------------------------- */
router.get('/:courseId/lessons', (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseModuleParamsSchema }), controllers_1.curriculumController.listLessons);
router.post('/:courseId/lessons', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseModuleParamsSchema, body: curriculum_validator_1.createLessonSchema }), controllers_1.curriculumController.createLesson);
router.get('/:courseId/lessons/:lessonId', (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseLessonParamsSchema }), controllers_1.curriculumController.getLesson);
router.patch('/:courseId/lessons/:lessonId', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseLessonParamsSchema, body: curriculum_validator_1.updateLessonSchema }), controllers_1.curriculumController.updateLesson);
router.delete('/:courseId/lessons/:lessonId', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseLessonParamsSchema }), controllers_1.curriculumController.deleteLesson);
exports.default = router;
//# sourceMappingURL=curriculum.routes.js.map