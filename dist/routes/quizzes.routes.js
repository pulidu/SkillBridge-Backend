"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseQuizRouter = void 0;
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const curriculum_validator_1 = require("../validators/curriculum.validator");
const quiz_validator_1 = require("../validators/quiz.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/* Attempts are a student-only capability, and grading is server side. */
router.post('/:id/attempts', (0, authorize_middleware_1.authorize)('student'), (0, validate_middleware_1.validate)({ params: quiz_validator_1.quizIdParamsSchema, body: quiz_validator_1.submitAttemptSchema }), controllers_1.quizController.submitAttempt);
router.get('/:id/attempts/me', (0, authorize_middleware_1.authorize)('student'), (0, validate_middleware_1.validate)({ params: quiz_validator_1.quizIdParamsSchema }), controllers_1.quizController.listMyAttempts);
router.get('/:id/attempts', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: quiz_validator_1.quizIdParamsSchema, query: quiz_validator_1.attemptListQuerySchema }), controllers_1.quizController.listAllAttempts);
router.get('/:id', (0, validate_middleware_1.validate)({ params: quiz_validator_1.quizIdParamsSchema }), controllers_1.quizController.getQuiz);
router.patch('/:id', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: quiz_validator_1.quizIdParamsSchema, body: quiz_validator_1.updateQuizSchema }), controllers_1.quizController.updateQuiz);
router.delete('/:id', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: quiz_validator_1.quizIdParamsSchema }), controllers_1.quizController.deleteQuiz);
/* Quizzes scoped to a course, mounted separately under /courses/:courseId. */
exports.courseQuizRouter = (0, express_1.Router)();
exports.courseQuizRouter.use(auth_middleware_1.authenticate);
exports.courseQuizRouter.get('/', (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseModuleParamsSchema }), controllers_1.quizController.listCourseQuizzes);
exports.courseQuizRouter.post('/', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: curriculum_validator_1.courseModuleParamsSchema, body: quiz_validator_1.createQuizSchema }), controllers_1.quizController.createQuiz);
exports.default = router;
//# sourceMappingURL=quizzes.routes.js.map