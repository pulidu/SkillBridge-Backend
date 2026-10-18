import { z } from 'zod';
import { objectIdSchema, safeUrlSchema } from './auth.validator';

/* -------------------------------------------------------------------------- */
/* Assignments                                                                 */
/* -------------------------------------------------------------------------- */

export const createAssignmentSchema = z.object({
  /** Optional: attach the task to the lesson that introduces it. */
  lesson: objectIdSchema.optional(),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  instructions: z
    .string()
    .trim()
    .min(10, 'Instructions must be at least 10 characters')
    .max(5000),
  /** Accepted as an ISO string and stored as a Date. */
  dueDate: z.coerce.date().optional(),
  maxMarks: z.coerce.number().int().min(1, 'Max marks must be at least 1').max(1000).default(100),
  isPublished: z.coerce.boolean().default(false),
});

export const updateAssignmentSchema = createAssignmentSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const listAssignmentsQuerySchema = z.object({
  includeUnpublished: z.coerce.boolean().default(false),
});

/* -------------------------------------------------------------------------- */
/* Nested routing params                                                       */
/* -------------------------------------------------------------------------- */

export const courseAssignmentParamsSchema = z.object({
  courseId: objectIdSchema,
});

export const assignmentIdParamsSchema = z.object({
  assignmentId: objectIdSchema,
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export { safeUrlSchema };