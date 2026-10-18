import type { Request, Response } from 'express';
import * as quizService from '../services/quiz.service';
import type { AuthUser } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { sendNoContent, sendSuccess } from '../utils/response';
import type {
  CreateQuizInput,
  SubmitAttemptInput,
  UpdateQuizInput,
} from '../validators/quiz.validator';

const currentUser = (req: Request): AuthUser => req.user as AuthUser;

export const listCourseQuizzes = asyncHandler(async (req: Request, res: Response) => {
  const quizzes = await quizService.listCourseQuizzes(req.params.courseId, currentUser(req));
  return sendSuccess(res, quizzes);
});

export const createQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quiz = await quizService.createQuiz(
    req.params.courseId,
    req.body as CreateQuizInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, quiz, 201);
});

export const getQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quiz = await quizService.getQuiz(req.params.id, currentUser(req));
  return sendSuccess(res, quiz);
});

export const updateQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quiz = await quizService.updateQuiz(
    req.params.id,
    req.body as UpdateQuizInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, quiz);
});

export const deleteQuiz = asyncHandler(async (req: Request, res: Response) => {
  await quizService.deleteQuiz(req.params.id, currentUser(req), req);
  return sendNoContent(res);
});

export const submitAttempt = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizService.submitAttempt(
    req.params.id,
    req.body as SubmitAttemptInput,
    currentUser(req),
  );
  return sendSuccess(res, result, 201);
});

export const listMyAttempts = asyncHandler(async (req: Request, res: Response) => {
  const attempts = await quizService.listMyAttempts(req.params.id, currentUser(req));
  return sendSuccess(res, attempts);
});

export const listAllAttempts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as { page?: string; limit?: string; passed?: string };
  const result = await quizService.listAllAttempts(req.params.id, currentUser(req), {
    page: Number(query.page) || undefined,
    limit: Number(query.limit) || undefined,
    passed: query.passed === undefined ? undefined : query.passed === 'true',
  });
  return sendSuccess(res, result.items, 200, result.meta);
});
