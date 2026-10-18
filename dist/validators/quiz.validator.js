"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attemptListQuerySchema = exports.courseQuizParamsSchema = exports.quizIdParamsSchema = exports.submitAttemptSchema = exports.updateQuizSchema = exports.createQuizSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
const auth_validator_1 = require("./auth.validator");
/* -------------------------------------------------------------------------- */
/* Quiz questions                                                              */
/* -------------------------------------------------------------------------- */
const questionSchema = zod_1.z
    .object({
    text: zod_1.z.string().trim().min(3, 'Question text must be at least 3 characters').max(1000),
    type: zod_1.z.enum(constants_1.QUESTION_TYPES).default('single'),
    options: zod_1.z
        .array(zod_1.z.object({
        text: zod_1.z.string().trim().min(1, 'Option text is required').max(300),
        isCorrect: zod_1.z.coerce.boolean().default(false),
    }))
        .max(10)
        .default([]),
    correctAnswer: zod_1.z.string().trim().max(300).optional(),
    points: zod_1.z.coerce.number().int().min(0).max(100).default(1),
    explanation: zod_1.z.string().trim().max(1000).optional(),
})
    .superRefine((question, ctx) => {
    if (question.type === 'short') {
        if (!question.correctAnswer) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['correctAnswer'],
                message: 'Short answer questions need a correct answer',
            });
        }
        return;
    }
    if (question.options.length < 2) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['options'],
            message: 'Choice questions need at least two options',
        });
        return;
    }
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    if (correctCount === 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['options'],
            message: 'At least one option must be marked correct',
        });
    }
    if (question.type === 'single' && correctCount > 1) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['options'],
            message: 'Single choice questions can only have one correct option',
        });
    }
});
/* -------------------------------------------------------------------------- */
/* Quiz                                                                        */
/* -------------------------------------------------------------------------- */
exports.createQuizSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(2, 'Quiz title is required').max(160),
    description: zod_1.z.string().trim().max(1000).optional(),
    lesson: auth_validator_1.objectIdSchema.optional(),
    questions: zod_1.z.array(questionSchema).min(1, 'A quiz needs at least one question').max(50),
    passingScore: zod_1.z.coerce.number().min(0).max(100).default(70),
    timeLimitMinutes: zod_1.z.coerce.number().int().min(1).max(600).optional(),
    maxAttempts: zod_1.z.coerce.number().int().min(1).max(20).default(3),
    shuffleQuestions: zod_1.z.coerce.boolean().default(false),
    isPublished: zod_1.z.coerce.boolean().default(false),
});
exports.updateQuizSchema = exports.createQuizSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});
/* -------------------------------------------------------------------------- */
/* Attempts                                                                    */
/* -------------------------------------------------------------------------- */
exports.submitAttemptSchema = zod_1.z.object({
    answers: zod_1.z
        .array(zod_1.z.object({
        question: auth_validator_1.objectIdSchema,
        selectedOptionIds: zod_1.z.array(auth_validator_1.objectIdSchema).max(10).default([]),
        textAnswer: zod_1.z.string().trim().max(2000).optional(),
    }))
        .min(1, 'Answer at least one question'),
    timeSpentSeconds: zod_1.z.coerce.number().int().min(0).max(86_400).default(0),
});
/* -------------------------------------------------------------------------- */
/* Params                                                                      */
/* -------------------------------------------------------------------------- */
exports.quizIdParamsSchema = zod_1.z.object({ id: auth_validator_1.objectIdSchema });
exports.courseQuizParamsSchema = zod_1.z.object({ courseId: auth_validator_1.objectIdSchema });
exports.attemptListQuerySchema = auth_validator_1.paginationSchema.extend({
    passed: zod_1.z.coerce.boolean().optional(),
});
//# sourceMappingURL=quiz.validator.js.map