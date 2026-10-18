"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStudyTasksQuerySchema = exports.taskIdParamsSchema = exports.updateStudyTaskBodySchema = exports.createStudyTaskBodySchema = void 0;
const zod_1 = require("zod");
const auth_validator_1 = require("./auth.validator");
exports.createStudyTaskBodySchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .trim()
        .min(2, 'Title must be at least 2 characters')
        .max(200, 'Title cannot exceed 200 characters'),
    description: zod_1.z.string().trim().max(1000).optional(),
    courseId: auth_validator_1.objectIdSchema.optional(),
    assignmentId: auth_validator_1.objectIdSchema.optional(),
    dueDate: zod_1.z.coerce.date(),
    estimatedStudyMinutes: zod_1.z.coerce.number().int().min(5).max(720).default(60),
    priority: zod_1.z.enum(['low', 'medium', 'high']).default('medium'),
});
exports.updateStudyTaskBodySchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(2).max(200).optional(),
    description: zod_1.z.string().trim().max(1000).optional(),
    dueDate: zod_1.z.coerce.date().optional(),
    estimatedStudyMinutes: zod_1.z.coerce.number().int().min(5).max(720).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high']).optional(),
    status: zod_1.z.enum(['todo', 'in_progress', 'completed']).optional(),
});
exports.taskIdParamsSchema = zod_1.z.object({
    id: auth_validator_1.objectIdSchema,
});
exports.listStudyTasksQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['todo', 'in_progress', 'completed', '']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', '']).optional(),
    courseId: zod_1.z.string().optional(),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
});
//# sourceMappingURL=study-task.validator.js.map