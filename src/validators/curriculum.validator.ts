import { z } from 'zod';
import { objectIdSchema, paginationSchema, safeUrlSchema } from './auth.validator';

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  description: z.string().trim().max(300).optional(),
  icon: z.string().trim().max(40).optional(),
  slug: z.string().trim().max(80).optional(),
});

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

/* -------------------------------------------------------------------------- */
/* Modules                                                                     */
/* -------------------------------------------------------------------------- */

export const createModuleSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(120),
  description: z.string().trim().max(1000).optional(),
  position: z.coerce.number().int().min(0).optional(),
});

export const updateModuleSchema = createModuleSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

/* -------------------------------------------------------------------------- */
/* Lessons                                                                     */
/* -------------------------------------------------------------------------- */

export const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: safeUrlSchema,
  size: z.coerce.number().min(0).default(0),
  mimeType: z.string().trim().max(120).optional(),
});

export const createLessonSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(160),
  module: objectIdSchema.optional(),
  content: z.string().max(50_000).optional(),
  videoUrl: safeUrlSchema.optional(),
  attachments: z.array(attachmentSchema).max(10).default([]),
  type: z.enum(['video', 'article', 'quiz', 'assignment']).default('article'),
  durationMinutes: z.coerce.number().int().min(0).max(600).default(0),
  isPreview: z.coerce.boolean().default(false),
  isPublished: z.coerce.boolean().default(false),
  position: z.coerce.number().int().min(0).optional(),
});

export const updateLessonSchema = createLessonSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

/* -------------------------------------------------------------------------- */
/* Nested routing params                                                       */
/* -------------------------------------------------------------------------- */

export const courseModuleParamsSchema = z.object({
  courseId: objectIdSchema,
});

export const courseModuleIdParamsSchema = z.object({
  courseId: objectIdSchema,
  moduleId: objectIdSchema,
});

export const courseLessonParamsSchema = z.object({
  courseId: objectIdSchema,
  lessonId: objectIdSchema,
});

/* -------------------------------------------------------------------------- */
/* Curriculum listing                                                          */
/* -------------------------------------------------------------------------- */

export const curriculumQuerySchema = paginationSchema.extend({
  includeUnpublished: z.coerce.boolean().default(false),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
