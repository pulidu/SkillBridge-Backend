"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.curriculumQuerySchema = exports.courseLessonParamsSchema = exports.courseModuleIdParamsSchema = exports.courseModuleParamsSchema = exports.updateLessonSchema = exports.createLessonSchema = exports.attachmentSchema = exports.updateModuleSchema = exports.createModuleSchema = exports.updateCategorySchema = exports.createCategorySchema = void 0;
const zod_1 = require("zod");
const auth_validator_1 = require("./auth.validator");
/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
    description: zod_1.z.string().trim().max(300).optional(),
    icon: zod_1.z.string().trim().max(40).optional(),
    slug: zod_1.z.string().trim().max(80).optional(),
});
exports.updateCategorySchema = exports.createCategorySchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});
/* -------------------------------------------------------------------------- */
/* Modules                                                                     */
/* -------------------------------------------------------------------------- */
exports.createModuleSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(2, 'Title must be at least 2 characters').max(120),
    description: zod_1.z.string().trim().max(1000).optional(),
    position: zod_1.z.coerce.number().int().min(0).optional(),
});
exports.updateModuleSchema = exports.createModuleSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});
/* -------------------------------------------------------------------------- */
/* Lessons                                                                     */
/* -------------------------------------------------------------------------- */
exports.attachmentSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(200),
    url: auth_validator_1.safeUrlSchema,
    size: zod_1.z.coerce.number().min(0).default(0),
    mimeType: zod_1.z.string().trim().max(120).optional(),
});
exports.createLessonSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(2, 'Title must be at least 2 characters').max(160),
    module: auth_validator_1.objectIdSchema.optional(),
    content: zod_1.z.string().max(50_000).optional(),
    videoUrl: auth_validator_1.safeUrlSchema.optional(),
    attachments: zod_1.z.array(exports.attachmentSchema).max(10).default([]),
    type: zod_1.z.enum(['video', 'article', 'quiz', 'assignment']).default('article'),
    durationMinutes: zod_1.z.coerce.number().int().min(0).max(600).default(0),
    isPreview: zod_1.z.coerce.boolean().default(false),
    isPublished: zod_1.z.coerce.boolean().default(false),
    position: zod_1.z.coerce.number().int().min(0).optional(),
});
exports.updateLessonSchema = exports.createLessonSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});
/* -------------------------------------------------------------------------- */
/* Nested routing params                                                       */
/* -------------------------------------------------------------------------- */
exports.courseModuleParamsSchema = zod_1.z.object({
    courseId: auth_validator_1.objectIdSchema,
});
exports.courseModuleIdParamsSchema = zod_1.z.object({
    courseId: auth_validator_1.objectIdSchema,
    moduleId: auth_validator_1.objectIdSchema,
});
exports.courseLessonParamsSchema = zod_1.z.object({
    courseId: auth_validator_1.objectIdSchema,
    lessonId: auth_validator_1.objectIdSchema,
});
/* -------------------------------------------------------------------------- */
/* Curriculum listing                                                          */
/* -------------------------------------------------------------------------- */
exports.curriculumQuerySchema = auth_validator_1.paginationSchema.extend({
    includeUnpublished: zod_1.z.coerce.boolean().default(false),
});
//# sourceMappingURL=curriculum.validator.js.map