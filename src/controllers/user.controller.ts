import type { Request, Response } from 'express';
import * as userService from '../services/user.service';
import type { AuthUser } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response';
import type {
  CreateUserInput,
  ListUsersInput,
  UpdateRoleInput,
  UpdateStatusInput,
  UpdateUserInput,
} from '../validators/auth.validator';

const currentUser = (req: Request): AuthUser => req.user as AuthUser;

/* ----------------------------- admin: all users ---------------------------- */

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.listUsers(req.query as unknown as ListUsersInput);
  return sendSuccess(res, result.items, 200, result.meta);
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id);
  return sendSuccess(res, user);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body as CreateUserInput, req);
  return sendCreated(res, user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUser(
    req.params.id,
    req.body as UpdateUserInput,
    req,
  );
  return sendSuccess(res, user);
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as UpdateRoleInput;
  const user = await userService.updateUserRole(req.params.id, role, req);
  return sendSuccess(res, user);
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as UpdateStatusInput;
  const user = await userService.updateUserStatus(req.params.id, status, req);
  return sendSuccess(res, user);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteUser(req.params.id, req);
  return sendNoContent(res);
});

/* ------------------------- any authenticated user -------------------------- */

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(currentUser(req).id);
  return sendSuccess(res, user);
});
