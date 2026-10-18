"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const study_task_validator_1 = require("../validators/study-task.validator");
const router = (0, express_1.Router)();
// All study planner routes require authentication
router.use(auth_middleware_1.authenticate);
/* ----------------------------- Analytics endpoints ---------------------------- */
router.get('/admin/analytics', (0, authorize_middleware_1.authorize)('admin'), controllers_1.studyTaskController.getAdminPlannerStats);
router.get('/instructor/analytics', (0, authorize_middleware_1.authorize)('instructor'), controllers_1.studyTaskController.getInstructorPlannerStats);
/* ----------------------------- Student endpoints ------------------------------ */
router.get('/stats', (0, authorize_middleware_1.authorize)('student'), controllers_1.studyTaskController.getStudentPlannerStats);
router.get('/weekly', (0, authorize_middleware_1.authorize)('student'), controllers_1.studyTaskController.getWeeklySchedule);
router.post('/suggestions', (0, authorize_middleware_1.authorize)('student'), controllers_1.studyTaskController.generateSuggestions);
router.get('/tasks', (0, authorize_middleware_1.authorize)('student'), (0, validate_middleware_1.validate)({ query: study_task_validator_1.listStudyTasksQuerySchema }), controllers_1.studyTaskController.listTasks);
router.post('/tasks', (0, authorize_middleware_1.authorize)('student'), (0, validate_middleware_1.validate)({ body: study_task_validator_1.createStudyTaskBodySchema }), controllers_1.studyTaskController.createTask);
router.get('/tasks/:id', (0, authorize_middleware_1.authorize)('student'), (0, validate_middleware_1.validate)({ params: study_task_validator_1.taskIdParamsSchema }), controllers_1.studyTaskController.getTaskById);
router.patch('/tasks/:id', (0, authorize_middleware_1.authorize)('student'), (0, validate_middleware_1.validate)({ params: study_task_validator_1.taskIdParamsSchema, body: study_task_validator_1.updateStudyTaskBodySchema }), controllers_1.studyTaskController.updateTask);
router.delete('/tasks/:id', (0, authorize_middleware_1.authorize)('student'), (0, validate_middleware_1.validate)({ params: study_task_validator_1.taskIdParamsSchema }), controllers_1.studyTaskController.deleteTask);
exports.default = router;
//# sourceMappingURL=study-task.routes.js.map