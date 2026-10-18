import type { Request, Response } from 'express';
import * as studyTaskService from '../services/study-task.service';
import type { AuthUser } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response';
import type { CreateStudyTaskInput, UpdateStudyTaskInput } from '../validators/study-task.validator';

const currentUser = (req: Request): AuthUser => req.user as AuthUser;

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const tasks = await studyTaskService.listTasks(currentUser(req), req.query);
  return sendSuccess(res, tasks);
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await studyTaskService.createTask(currentUser(req), req.body as CreateStudyTaskInput);
  return sendCreated(res, task);
});

export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const task = await studyTaskService.getTaskById(req.params.id, currentUser(req));
  return sendSuccess(res, task);
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await studyTaskService.updateTask(
    req.params.id,
    currentUser(req),
    req.body as UpdateStudyTaskInput,
  );
  return sendSuccess(res, task);
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  await studyTaskService.deleteTask(req.params.id, currentUser(req));
  return sendNoContent(res);
});

export const generateSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const result = await studyTaskService.generateSuggestions(currentUser(req));
  return sendSuccess(res, result);
});

export const getWeeklySchedule = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await studyTaskService.getWeeklySchedule(
    currentUser(req),
    req.query.weekStart as string | undefined,
  );
  return sendSuccess(res, schedule);
});

export const getStudentPlannerStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await studyTaskService.getStudentPlannerStats(currentUser(req));
  return sendSuccess(res, stats);
});

export const getAdminPlannerStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await studyTaskService.getAdminPlannerStats();
  return sendSuccess(res, stats);
});

export const getInstructorPlannerStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await studyTaskService.getInstructorPlannerStats(currentUser(req));
  return sendSuccess(res, stats);
});
