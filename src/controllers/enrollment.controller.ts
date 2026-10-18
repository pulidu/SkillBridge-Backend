import type { Request, Response } from 'express';
import * as enrollmentService from '../services/enrollment.service';
import * as submissionService from '../services/submission.service';
import type { AuthUser } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { sendNoContent, sendSuccess } from '../utils/response';
import type {
  CreateEnrollmentInput,
  CreateSubmissionInput,
  GradeSubmissionInput,
  ListEnrollmentsInput,
  ListSubmissionsInput,
  UpdateEnrollmentInput,
} from '../validators/enrollment.validator';

const currentUser = (req: Request): AuthUser => req.user as AuthUser;

/* ------------------------------ enrollments -------------------------------- */

export const createEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const enrollment = await enrollmentService.createEnrollment(
    req.body as CreateEnrollmentInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, enrollment, 201);
});

export const listMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as { page?: string; limit?: string; status?: string };
  const result = await enrollmentService.listMyEnrollments(currentUser(req), {
    page: Number(query.page) || undefined,
    limit: Number(query.limit) || undefined,
    status: query.status,
  });
  return sendSuccess(res, result.items, 200, result.meta);
});

export const listEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const result = await enrollmentService.listEnrollments(
    req.query as unknown as ListEnrollmentsInput,
    currentUser(req),
  );
  return sendSuccess(res, result.items, 200, result.meta);
});

export const getEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const enrollment = await enrollmentService.getEnrollmentById(req.params.id, currentUser(req));
  return sendSuccess(res, enrollment);
});

export const updateEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const enrollment = await enrollmentService.updateEnrollment(
    req.params.id,
    req.body as UpdateEnrollmentInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, enrollment);
});

export const cancelEnrollment = asyncHandler(async (req: Request, res: Response) => {
  await enrollmentService.cancelEnrollment(req.params.id, currentUser(req), req);
  return sendNoContent(res);
});

/* -------------------------------- progress --------------------------------- */

export const getMyProgress = asyncHandler(async (req: Request, res: Response) => {
  const progress = await enrollmentService.getMyProgress(currentUser(req));
  return sendSuccess(res, progress);
});

export const getEnrollmentProgress = asyncHandler(async (req: Request, res: Response) => {
  const progress = await enrollmentService.getEnrollmentProgress(
    req.params.enrollmentId,
    currentUser(req),
  );
  return sendSuccess(res, progress);
});

export const completeLesson = asyncHandler(async (req: Request, res: Response) => {
  const result = await enrollmentService.completeLesson(req.params.lessonId, currentUser(req));
  return sendSuccess(res, result);
});

export const uncompleteLesson = asyncHandler(async (req: Request, res: Response) => {
  const enrollment = await enrollmentService.uncompleteLesson(req.params.lessonId, currentUser(req));
  return sendSuccess(res, enrollment);
});

/* ----------------------------- certificates -------------------------------- */

export const listMyCertificates = asyncHandler(async (req: Request, res: Response) => {
  const certificates = await enrollmentService.listMyCertificates(currentUser(req));
  return sendSuccess(res, certificates);
});

export const verifyCertificate = asyncHandler(async (req: Request, res: Response) => {
  const certificate = await enrollmentService.verifyCertificate(req.params.serialNumber);
  return sendSuccess(res, certificate);
});

export const revokeCertificate = asyncHandler(async (req: Request, res: Response) => {
  const certificate = await enrollmentService.revokeCertificate(req.params.id, currentUser(req));
  return sendSuccess(res, certificate);
});

/* ------------------------------ submissions -------------------------------- */

export const createSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await submissionService.createSubmission(
    req.body as CreateSubmissionInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, submission, 201);
});

export const listMySubmissions = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as { page?: string; limit?: string; status?: string };
  const result = await submissionService.listMySubmissions(currentUser(req), {
    page: Number(query.page) || undefined,
    limit: Number(query.limit) || undefined,
    status: query.status,
  });
  return sendSuccess(res, result.items, 200, result.meta);
});

export const listSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const result = await submissionService.listSubmissions(
    req.query as unknown as ListSubmissionsInput,
    currentUser(req),
  );
  return sendSuccess(res, result.items, 200, result.meta);
});

export const gradeSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await submissionService.gradeSubmission(
    req.params.id,
    req.body as GradeSubmissionInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, submission);
});
