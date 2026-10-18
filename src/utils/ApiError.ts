import type { FieldError } from '../types';

/**
 * Operational error with an HTTP status code. Anything thrown that is not an
 * ApiError is treated as an unexpected 500 by the error handler.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors?: FieldError[];
  public readonly isOperational = true;

  constructor(statusCode: number, message: string, errors?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message = 'Bad request', errors?: FieldError[]): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists'): ApiError {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Validation failed', errors?: FieldError[]): ApiError {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message);
  }
}
