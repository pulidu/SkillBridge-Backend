"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authorize_middleware_1 = require("../middleware/authorize.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const enrollment_validator_1 = require("../validators/enrollment.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/me', (0, validate_middleware_1.validate)({ query: enrollment_validator_1.listSubmissionsSchema }), controllers_1.enrollmentController.listMySubmissions);
router.post('/', (0, authorize_middleware_1.authorize)('student'), (0, validate_middleware_1.validate)({ body: enrollment_validator_1.createSubmissionSchema }), controllers_1.enrollmentController.createSubmission);
router.get('/', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ query: enrollment_validator_1.listSubmissionsSchema }), controllers_1.enrollmentController.listSubmissions);
router.patch('/:id/grade', (0, authorize_middleware_1.authorize)('admin', 'instructor'), (0, validate_middleware_1.validate)({ params: enrollment_validator_1.submissionIdParamsSchema, body: enrollment_validator_1.gradeSubmissionSchema }), controllers_1.enrollmentController.gradeSubmission);
exports.default = router;
//# sourceMappingURL=submissions.routes.js.map