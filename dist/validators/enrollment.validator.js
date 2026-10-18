"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogsSchema = exports.certificateSerialParamsSchema = exports.notificationIdParamsSchema = exports.listNotificationsSchema = exports.submissionIdParamsSchema = exports.gradeSubmissionSchema = exports.listSubmissionsSchema = exports.createSubmissionSchema = exports.lessonSubmissionSchema = exports.assignmentSubmissionSchema = exports.submissionAttachmentSchema = exports.progressEnrollmentParamsSchema = exports.lessonActionParamsSchema = exports.enrollmentStudentParamsSchema = exports.enrollmentIdParamsSchema = exports.updateEnrollmentSchema = exports.listEnrollmentsSchema = exports.createEnrollmentSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
const auth_validator_1 = require("./auth.validator");
/* -------------------------------------------------------------------------- */
/* Enrollments                                                                 */
/* -------------------------------------------------------------------------- */
exports.createEnrollmentSchema = zod_1.z.object({
    course: auth_validator_1.objectIdSchema,
    // Present for admin-initiated enrolment; ignored for self-enrolment.
    student: auth_validator_1.objectIdSchema.optional(),
});
exports.listEnrollmentsSchema = auth_validator_1.paginationSchema.extend({
    course: auth_validator_1.objectIdSchema.optional(),
    student: auth_validator_1.objectIdSchema.optional(),
    status: zod_1.z.enum(constants_1.ENROLLMENT_STATUSES).optional(),
});
exports.updateEnrollmentSchema = zod_1.z.object({
    status: zod_1.z.enum(constants_1.ENROLLMENT_STATUSES).optional(),
    finalScore: zod_1.z.coerce.number().min(0).max(100).optional(),
});
exports.enrollmentIdParamsSchema = zod_1.z.object({ id: auth_validator_1.objectIdSchema });
exports.enrollmentStudentParamsSchema = zod_1.z.object({ studentId: auth_validator_1.objectIdSchema });
/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */
exports.lessonActionParamsSchema = zod_1.z.object({ lessonId: auth_validator_1.objectIdSchema });
exports.progressEnrollmentParamsSchema = zod_1.z.object({ enrollmentId: auth_validator_1.objectIdSchema });
/* -------------------------------------------------------------------------- */
/* Submissions                                                                 */
/* -------------------------------------------------------------------------- */
exports.submissionAttachmentSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(200),
    url: auth_validator_1.safeUrlSchema,
    size: zod_1.z.coerce.number().min(0).default(0),
    mimeType: zod_1.z.string().trim().max(120).optional(),
});
const answerFields = {
    answerText: zod_1.z.string().trim().max(20_000).optional(),
    answerURL: auth_validator_1.safeUrlSchema.optional(),
    attachments: zod_1.z.array(exports.submissionAttachmentSchema).max(10).default([]),
};
/** A submission is only meaningful if the learner actually answered something. */
const hasAnswer = (value) => Boolean(value.answerText || value.answerURL) || value.attachments.length > 0;
/** Preferred path: answer a first-class assignment. */
exports.assignmentSubmissionSchema = zod_1.z
    .object({ assignment: auth_validator_1.objectIdSchema, ...answerFields })
    .refine(hasAnswer, {
    message: 'Provide answerText, answerURL, or an attachment',
});
/** Legacy path: answer an assignment-type lesson. */
exports.lessonSubmissionSchema = zod_1.z.object({
    course: auth_validator_1.objectIdSchema,
    lesson: auth_validator_1.objectIdSchema,
    content: zod_1.z.string().trim().min(1, 'Submission cannot be empty').max(20_000),
    attachments: zod_1.z.array(exports.submissionAttachmentSchema).max(10).default([]),
});
exports.createSubmissionSchema = zod_1.z.union([
    exports.assignmentSubmissionSchema,
    exports.lessonSubmissionSchema,
]);
exports.listSubmissionsSchema = auth_validator_1.paginationSchema.extend({
    course: auth_validator_1.objectIdSchema.optional(),
    student: auth_validator_1.objectIdSchema.optional(),
    status: zod_1.z.enum(constants_1.SUBMISSION_STATUSES).optional(),
});
exports.gradeSubmissionSchema = zod_1.z.object({
    grade: zod_1.z.coerce.number().min(0, 'Grade cannot be negative').max(100),
    feedback: zod_1.z.string().trim().max(2000).optional(),
    status: zod_1.z.enum(['graded', 'returned']).default('graded'),
});
exports.submissionIdParamsSchema = zod_1.z.object({ id: auth_validator_1.objectIdSchema });
/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */
exports.listNotificationsSchema = auth_validator_1.paginationSchema.extend({
    unread: auth_validator_1.booleanQuery.optional(),
    type: zod_1.z.enum(constants_1.NOTIFICATION_TYPES).optional(),
});
exports.notificationIdParamsSchema = zod_1.z.object({ id: auth_validator_1.objectIdSchema });
exports.certificateSerialParamsSchema = zod_1.z.object({
    serialNumber: zod_1.z.string().trim().min(4).max(64),
});
/* -------------------------------------------------------------------------- */
/* Audit logs                                                                  */
/* -------------------------------------------------------------------------- */
exports.listAuditLogsSchema = auth_validator_1.paginationSchema.extend({
    actor: auth_validator_1.objectIdSchema.optional(),
    entity: zod_1.z.string().trim().max(40).optional(),
    action: zod_1.z.string().trim().max(60).optional(),
});
//# sourceMappingURL=enrollment.validator.js.map