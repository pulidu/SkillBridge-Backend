"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const assignment_validator_1 = require("../validators/assignment.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/:assignmentId', (0, validate_middleware_1.validate)({ params: assignment_validator_1.assignmentIdParamsSchema }), controllers_1.assignmentController.getAssignment);
router.patch('/:assignmentId', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: assignment_validator_1.assignmentIdParamsSchema, body: assignment_validator_1.updateAssignmentSchema }), controllers_1.assignmentController.updateAssignment);
router.delete('/:assignmentId', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: assignment_validator_1.assignmentIdParamsSchema }), controllers_1.assignmentController.deleteAssignment);
exports.default = router;
//# sourceMappingURL=assignment.routes.js.map