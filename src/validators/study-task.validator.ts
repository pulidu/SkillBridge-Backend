import { z } from 'zod';
import { objectIdSchema } from './auth.validator';

export const createStudyTaskBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(1000).optional(),
  courseId: objectIdSchema.optional(),
  assignmentId: objectIdSchema.optional(),
  dueDate: z.coerce.date(),
  estimatedStudyMinutes: z.coerce.number().int().min(5).max(720).default(60),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const updateStudyTaskBodySchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  dueDate: z.coerce.date().optional(),
  estimatedStudyMinutes: z.coerce.number().int().min(5).max(720).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
});

export const taskIdParamsSchema = z.object({
  id: objectIdSchema,
});

export const listStudyTasksQuerySchema = z.object({
  status: z.enum(['todo', 'in_progress', 'completed', '']).optional(),
  priority: z.enum(['low', 'medium', 'high', '']).optional(),
  courseId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreateStudyTaskInput = z.infer<typeof createStudyTaskBodySchema>;
export type UpdateStudyTaskInput = z.infer<typeof updateStudyTaskBodySchema>;
