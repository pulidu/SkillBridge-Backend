import { z } from 'zod';
import { QUESTION_TYPES } from '../constants';
import { objectIdSchema, paginationSchema } from './auth.validator';

/* -------------------------------------------------------------------------- */
/* Quiz questions                                                              */
/* -------------------------------------------------------------------------- */

const questionSchema = z
  .object({
    text: z.string().trim().min(3, 'Question text must be at least 3 characters').max(1000),
    type: z.enum(QUESTION_TYPES).default('single'),
    options: z
      .array(
        z.object({
          text: z.string().trim().min(1, 'Option text is required').max(300),
          isCorrect: z.coerce.boolean().default(false),
        }),
      )
      .max(10)
      .default([]),
    correctAnswer: z.string().trim().max(300).optional(),
    points: z.coerce.number().int().min(0).max(100).default(1),
    explanation: z.string().trim().max(1000).optional(),
  })
  .superRefine((question, ctx) => {
    if (question.type === 'short') {
      if (!question.correctAnswer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctAnswer'],
          message: 'Short answer questions need a correct answer',
        });
      }
      return;
    }

    if (question.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Choice questions need at least two options',
      });
      return;
    }

    const correctCount = question.options.filter((option) => option.isCorrect).length;
    if (correctCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'At least one option must be marked correct',
      });
    }
    if (question.type === 'single' && correctCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Single choice questions can only have one correct option',
      });
    }
  });

/* -------------------------------------------------------------------------- */
/* Quiz                                                                        */
/* -------------------------------------------------------------------------- */

export const createQuizSchema = z.object({
  title: z.string().trim().min(2, 'Quiz title is required').max(160),
  description: z.string().trim().max(1000).optional(),
  lesson: objectIdSchema.optional(),
  questions: z.array(questionSchema).min(1, 'A quiz needs at least one question').max(50),
  passingScore: z.coerce.number().min(0).max(100).default(70),
  timeLimitMinutes: z.coerce.number().int().min(1).max(600).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(20).default(3),
  shuffleQuestions: z.coerce.boolean().default(false),
  isPublished: z.coerce.boolean().default(false),
});

export const updateQuizSchema = createQuizSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

/* -------------------------------------------------------------------------- */
/* Attempts                                                                    */
/* -------------------------------------------------------------------------- */

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        question: objectIdSchema,
        selectedOptionIds: z.array(objectIdSchema).max(10).default([]),
        textAnswer: z.string().trim().max(2000).optional(),
      }),
    )
    .min(1, 'Answer at least one question'),
  timeSpentSeconds: z.coerce.number().int().min(0).max(86_400).default(0),
});

/* -------------------------------------------------------------------------- */
/* Params                                                                      */
/* -------------------------------------------------------------------------- */

export const quizIdParamsSchema = z.object({ id: objectIdSchema });
export const courseQuizParamsSchema = z.object({ courseId: objectIdSchema });

export const attemptListQuerySchema = paginationSchema.extend({
  passed: z.coerce.boolean().optional(),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;