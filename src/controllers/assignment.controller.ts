import type { Request, Response } from 'express';
import * as assignmentService from '../services/assignment.service';
import type { AuthUser } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response';
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from '../validators/assignment.validator';

const currentUser = (req: Request): AuthUser => req.user as AuthUser;

/**
 * HTTP layer for assignments. All authorisation decisions live in the service,
 * so these handlers only translate between Express and the service functions.
 */

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const assignments = await assignmentService.listAssignments(
    req.params.courseId,
    req.query.includeUnpublished === 'true',
    currentUser(req),
  );
  return sendSuccess(res, assignments);
});

export const getAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await assignmentService.getAssignment(
    req.params.assignmentId,
    currentUser(req),
  );
  return sendSuccess(res, assignment);
});

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await assignmentService.createAssignment(
    req.params.courseId,
    req.body as CreateAssignmentInput,
    currentUser(req),
    req,
  );
  return sendCreated(res, assignment);
});

export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await assignmentService.updateAssignment(
    req.params.assignmentId,
    req.body as UpdateAssignmentInput,
    currentUser(req),
    req,
  );
  return sendSuccess(res, assignment);
});

export const deleteAssignment = asyncHandler(async (req: Request, res: Response) => {
  await assignmentService.deleteAssignment(req.params.assignmentId, currentUser(req), req);
  return sendNoContent(res);
});