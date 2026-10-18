import type { Request } from 'express';
import { USER_STATUSES, type Role, type UserStatus } from '../constants';
import { User, toUserResponse } from '../models';
import type { PaginatedResult } from '../types';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import type { ListUsersInput, CreateUserInput, UpdateUserInput } from '../validators/auth.validator';
import { PRIVILEGED_ROLES } from '../validators/auth.validator';
import { hashPassword, revokeAllSessions } from './auth.service';
import { recordAudit } from './audit.service';

/** Paginated user list with role, status and text search filters. */
export const listUsers = async (
  input: ListUsersInput,
): Promise<PaginatedResult<ReturnType<typeof toUserResponse>>> => {
  const { page, limit, skip } = parsePagination(input);

  const filter: Record<string, unknown> = { isDeleted: false };
  if (input.role) filter.roles = input.role;
  if (input.status) filter.status = input.status;
  if (input.search) {
    // Escaped so a search term is treated as text, never as a regex.
    const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { fullName: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { items: users.map(toUserResponse), meta: buildPaginationMeta(total, page, limit) };
};

/**
 * Creates a privileged account on behalf of an administrator.
 *
 * This is the only path besides `scripts/create-admin.ts` that can produce a
 * non-student role. The caller's authority is already established by
 * `authorize('admin')` on the route; the role is additionally narrowed to the
 * privileged set so a schema slip can never mint an arbitrary role, and the
 * password is hashed here rather than accepted pre-hashed from the client.
 */
export const createUser = async (
  input: CreateUserInput,
  req: Request,
): Promise<ReturnType<typeof toUserResponse>> => {
  if (!PRIVILEGED_ROLES.includes(input.role)) {
    throw ApiError.forbidden('Only instructor and admin accounts can be created here');
  }

  const existing = await User.findOne({ email: input.email });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const user = await User.create({
    fullName: input.fullName,
    email: input.email,
    password: await hashPassword(input.password),
    roles: [input.role] satisfies Role[],
    bio: input.bio,
  });

  await recordAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user?.roles[0],
    action: 'user.create',
    entity: 'User',
    entityId: String(user._id),
    // The password is never recorded, not even hashed.
    meta: { email: user.email, role: input.role },
  });

  return toUserResponse(user);
};

export const getUserById = async (id: string): Promise<ReturnType<typeof toUserResponse>> => {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return toUserResponse(user);
};

export const updateUser = async (
  id: string,
  input: UpdateUserInput,
  req: Request,
): Promise<ReturnType<typeof toUserResponse>> => {
  if (input.email) {
    const duplicate = await User.findOne({ email: input.email, _id: { $ne: id } });
    if (duplicate) throw ApiError.conflict('That email is already in use');
  }

  const user = await User.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');

  await recordAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user?.roles[0],
    action: 'user.update',
    entity: 'User',
    entityId: id,
    meta: { fields: Object.keys(input) },
  });

  return toUserResponse(user);
};

/**
 * Changes a role. Guards against removing the last active administrator, which
 * would lock everyone out of the admin surface.
 */
export const updateUserRole = async (
  id: string,
  role: Role,
  req: Request,
): Promise<ReturnType<typeof toUserResponse>> => {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  const isSelf = String(user._id) === req.user?.id;

  if (isSelf && role !== user.roles[0]) {
    throw ApiError.badRequest('You cannot change your own role');
  }

  const losingAdmin = user.roles.includes('admin') && role !== 'admin';
  if (losingAdmin) {
    const remainingAdmins = await User.countDocuments({
      roles: 'admin',
      status: 'active',
      isDeleted: false,
      _id: { $ne: user._id },
    });
    if (remainingAdmins === 0) {
      throw ApiError.badRequest('At least one active administrator must remain');
    }
  }

  user.roles = [role];
  await user.save();

  // The old role's permissions no longer apply, so drop live sessions.
  await revokeAllSessions(id);

  await recordAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user?.roles[0],
    action: 'user.role_change',
    entity: 'User',
    entityId: id,
    meta: { role },
  });

  return toUserResponse(user);
};

/** Suspends or reactivates an account and revokes its sessions. */
export const updateUserStatus = async (
  id: string,
  status: UserStatus,
  req: Request,
): Promise<ReturnType<typeof toUserResponse>> => {
  if (req.user?.id === id) throw ApiError.badRequest('You cannot change your own status');

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  if (status === 'suspended' && user.roles.includes('admin')) {
    const remainingAdmins = await User.countDocuments({
      roles: 'admin',
      status: 'active',
      isDeleted: false,
      _id: { $ne: user._id },
    });
    if (remainingAdmins === 0) {
      throw ApiError.badRequest('At least one active administrator must remain');
    }
  }

  user.status = status;
  await user.save();

  if (status === 'suspended') await revokeAllSessions(id);

  await recordAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user?.roles[0],
    action: 'user.status_change',
    entity: 'User',
    entityId: id,
    meta: { status },
  });

  return toUserResponse(user);
};

/** Soft delete so enrolments and certificates keep valid references. */
export const deleteUser = async (id: string, req: Request): Promise<void> => {
  if (req.user?.id === id) throw ApiError.badRequest('You cannot delete your own account');

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isDeleted: true, status: 'suspended' satisfies UserStatus } },
    { new: true },
  );

  if (!user) throw ApiError.notFound('User not found');

  await revokeAllSessions(id);

  await recordAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user?.roles[0],
    action: 'user.delete',
    entity: 'User',
    entityId: id,
  });
};

/** All statuses, used by the admin user table filter dropdown. */
export const availableStatuses = (): readonly UserStatus[] => USER_STATUSES;
