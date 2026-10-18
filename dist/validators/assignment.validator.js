"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeUrlSchema = exports.assignmentIdParamsSchema = exports.courseAssignmentParamsSchema = exports.listAssignmentsQuerySchema = exports.updateAssignmentSchema = exports.createAssignmentSchema = void 0;
const zod_1 = require("zod");
const auth_validator_1 = require("./auth.validator");
Object.defineProperty(exports, "safeUrlSchema", { enumerable: true, get: function () { return auth_validator_1.safeUrlSchema; } });
/* -------------------------------------------------------------------------- */
/* Assignments                                                                 */
/* -------------------------------------------------------------------------- */
exports.createAssignmentSchema = zod_1.z.object({
    /** Optional: attach the task to the lesson that introduces it. */
    lesson: auth_validator_1.objectIdSchema.optional(),
    title: zod_1.z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
    instructions: zod_1.z
        .string()
        .trim()
        .min(10, 'Instructions must be at least 10 characters')
        .max(5000),
    /** Accepted as an ISO string and stored as a Date. */
    dueDate: zod_1.z.coerce.date().optional(),
    maxMarks: zod_1.z.coerce.number().int().min(1, 'Max marks must be at least 1').max(1000).default(100),
    isPublished: zod_1.z.coerce.boolean().default(false),
});
exports.updateAssignmentSchema = exports.createAssignmentSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});
exports.listAssignmentsQuerySchema = zod_1.z.object({
    includeUnpublished: zod_1.z.coerce.boolean().default(false),
});
/* -------------------------------------------------------------------------- */
/* Nested routing params                                                       */
/* -------------------------------------------------------------------------- */
exports.courseAssignmentParamsSchema = zod_1.z.object({
    courseId: auth_validator_1.objectIdSchema,
});
exports.assignmentIdParamsSchema = zod_1.z.object({
    assignmentId: auth_validator_1.objectIdSchema,
});
//# sourceMappingURL=assignment.validator.js.map