import type { Request, Response } from 'express';
import * as courseService from '../services/course.service';
import type { AuthUser } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { sendNoContent, sendSuccess } from '../utils/response';
import type {
  AssignInstructorInput,
  CreateCourseInput,
  CreateRatingInput,
  ListCoursesInput,
  UpdateCourseInput,
} from '../validators/course.validator';

const currentUser = (req: Request): AuthUser => req.user as AuthUser;

export const listCourses = asyncHandler(async (req: Request, res: Response) => {
  const result = await courseService.listCourses(
    req.query as unknown as ListCoursesInput,
    req.user,
  );
  return sendSuccess(res, result.items, 200, result.meta);
});

export const listFeaturedCourses = asyncHandler(async (_req: Request, res: Response) => {
  const courses = await courseService.listFeaturedCourses();
  return sendSuccess(res, courses);
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await courseService.getCourseById(req.params.id, req.user);
  return sendSuccess(res, course);
});

export const getCourseBySlug = asyncHandler(async (req: Request, res: Response) => {
  const course = await courseService.getCourseBySlug(req.params.slug, req.user);
  return sendSuccess(res, course);
});

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await courseService.createCourse(
    req.body as CreateCourseInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, course, 201);
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await courseService.updateCourse(
    req.params.id,
    req.body as UpdateCourseInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, course);
});

export const assignCourseInstructor = asyncHandler(async (req: Request, res: Response) => {
  const { instructor } = req.body as AssignInstructorInput;
  const course = await courseService.assignCourseInstructor(
    req.params.id,
    instructor,
    currentUser(req),
    req,
  );
  return sendSuccess(res, course);
});

export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  await courseService.deleteCourse(req.params.id, currentUser(req), req);
  return sendNoContent(res);
});

export const publishCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await courseService.setCourseStatus(req.params.id, 'published', currentUser(req), req);
  return sendSuccess(res, course);
});

export const unpublishCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await courseService.setCourseStatus(req.params.id, 'draft', currentUser(req), req);
  return sendSuccess(res, course);
});

export const archiveCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await courseService.setCourseStatus(req.params.id, 'archived', currentUser(req), req);
  return sendSuccess(res, course);
});

export const getCourseAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await courseService.getCourseAnalytics(req.params.id, currentUser(req));
  return sendSuccess(res, analytics);
});

export const getCourseStudents = asyncHandler(async (req: Request, res: Response) => {
  const result = await courseService.listCourseStudents(req.params.id, currentUser(req), {
    page: Number((req.query as { page?: string }).page) || undefined,
    limit: Number((req.query as { limit?: string }).limit) || undefined,
    status: (req.query as { status?: string }).status,
    search: (req.query as { search?: string }).search,
  });
  return sendSuccess(res, result.items, 200, result.meta);
});

export const rateCourse = asyncHandler(async (req: Request, res: Response) => {
  const rating = await courseService.rateCourse(
    req.params.id,
    req.body as CreateRatingInput,
    currentUser(req),
  );
  return sendSuccess(res, rating, 201);
});

export const listCourseRatings = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as { page?: string; limit?: string };
  const result = await courseService.listCourseRatings(
    req.params.id,
    Number(query.page) || 1,
    Number(query.limit) || 20,
  );
  return sendSuccess(res, result.items, 200, result.meta);
});
