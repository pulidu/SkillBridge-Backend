import type { Request, Response } from 'express';
import * as courseService from '../services/course.service';
import * as curriculumService from '../services/curriculum.service';
import type { AuthUser } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { sendNoContent, sendSuccess } from '../utils/response';
import type {
  CreateCategoryInput,
  CreateLessonInput,
  CreateModuleInput,
  UpdateCategoryInput,
  UpdateLessonInput,
  UpdateModuleInput,
} from '../validators/curriculum.validator';

const currentUser = (req: Request): AuthUser => req.user as AuthUser;

/* ------------------------------- categories -------------------------------- */

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await curriculumService.listCategories();
  return sendSuccess(res, categories);
});

export const listCategoriesWithCounts = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await courseService.listCategoriesWithCounts();
  return sendSuccess(res, categories);
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await curriculumService.getCategory(req.params.id);
  return sendSuccess(res, category);
});

export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const category = await curriculumService.getCategoryBySlug(req.params.slug);
  return sendSuccess(res, category);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await curriculumService.createCategory(req.body as CreateCategoryInput, req);
  return sendSuccess(res, category, 201);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await curriculumService.updateCategory(
    req.params.id,
    req.body as UpdateCategoryInput,
    req,
  );
  return sendSuccess(res, category);
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await curriculumService.deleteCategory(req.params.id, req);
  return sendNoContent(res);
});

/* --------------------------------- modules --------------------------------- */

export const listModules = asyncHandler(async (req: Request, res: Response) => {
  const modules = await curriculumService.listModules(req.params.courseId, currentUser(req));
  return sendSuccess(res, modules);
});

export const createModule = asyncHandler(async (req: Request, res: Response) => {
  const module = await curriculumService.createModule(
    req.params.courseId,
    req.body as CreateModuleInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, module, 201);
});

export const updateModule = asyncHandler(async (req: Request, res: Response) => {
  const module = await curriculumService.updateModule(
    req.params.courseId,
    req.params.moduleId,
    req.body as UpdateModuleInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, module);
});

export const deleteModule = asyncHandler(async (req: Request, res: Response) => {
  await curriculumService.deleteModule(
    req.params.courseId,
    req.params.moduleId,
    currentUser(req),
    req,
  );
  return sendNoContent(res);
});

/* --------------------------------- lessons --------------------------------- */

export const listLessons = asyncHandler(async (req: Request, res: Response) => {
  const includeUnpublished = (req.query as { includeUnpublished?: string })
    .includeUnpublished === 'true';

  const lessons = await curriculumService.listLessons(
    req.params.courseId,
    currentUser(req),
    includeUnpublished,
  );
  return sendSuccess(res, lessons);
});

export const getLesson = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await curriculumService.getLesson(
    req.params.courseId,
    req.params.lessonId,
    currentUser(req),
  );
  return sendSuccess(res, lesson);
});

export const createLesson = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await curriculumService.createLesson(
    req.params.courseId,
    req.body as CreateLessonInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, lesson, 201);
});

export const updateLesson = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await curriculumService.updateLesson(
    req.params.courseId,
    req.params.lessonId,
    req.body as UpdateLessonInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, lesson);
});

export const deleteLesson = asyncHandler(async (req: Request, res: Response) => {
  await curriculumService.deleteLesson(
    req.params.courseId,
    req.params.lessonId,
    currentUser(req),
    req,
  );
  return sendNoContent(res);
});

/* ------------------------------- curriculum -------------------------------- */

export const getCurriculum = asyncHandler(async (req: Request, res: Response) => {
  const curriculum = await curriculumService.getCurriculum(req.params.courseId, currentUser(req));
  return sendSuccess(res, curriculum);
});

export const listInstructors = asyncHandler(async (_req: Request, res: Response) => {
  const instructors = await curriculumService.listInstructors();
  return sendSuccess(res, instructors);
});
