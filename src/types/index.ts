import type { Role, UserStatus } from '../constants';

/**
 * The user object attached to `req` by `authenticate`. Always the shape that is
 * safe to send to a client - never includes the password hash.
 */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  roles: Role[];
  avatarUrl?: string;
  status: UserStatus;
}

/** Actor used by the audit log service. */
export interface AuditActor {
  id: string;
  role: Role;
}

/** Normalised pagination metadata returned in the response envelope. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Result of a paginated service call. */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Field-level validation failure, rendered by the error handler. */
export interface FieldError {
  field: string;
  message: string;
}
