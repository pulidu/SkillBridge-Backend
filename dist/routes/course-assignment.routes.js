"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const assignment_validator_1 = require("../validators/assignment.validator");
/**
 * Assignments are addressed in two ways:
 *   - nested under the course that owns them  -> /api/v1/courses/:courseId/assignments
 *   - directly by id                         -> /api/v1/assignments/:assignmentId
 */
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/* ------------------------------- course scoped ----------------------------- */
// Reads are open to any authenticated caller: the service hides unpublished
// work from anyone who does not own the course.
router.get('/:courseId/assignments', (0, validate_middleware_1.validate)({ params: assignment_validator_1.courseAssignmentParamsSchema, query: assignment_validator_1.listAssignmentsQuerySchema }), controllers_1.assignmentController.listAssignments);
router.post('/:courseId/assignments', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: assignment_validator_1.courseAssignmentParamsSchema, body: assignment_validator_1.createAssignmentSchema }), controllers_1.assignmentController.createAssignment);
exports.default = router;
//# sourceMappingURL=course-assignment.routes.js.map