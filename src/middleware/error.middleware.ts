import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Error as MongooseError } from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

/** Terminal 404 handler for unmatched routes. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Global error handler. Registered last and must keep its 4-parameter
 * signature for Express to recognise it.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: { field: string; message: string }[] | undefined;

  if (error instanceof ApiError || (error && typeof error === 'object' && 'statusCode' in error && typeof (error as Record<string, unknown>).statusCode === 'number')) {
    const err = error as { statusCode: number; message: string; errors?: { field: string; message: string }[] };
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (error instanceof ZodError) {
    statusCode = 422;
    message = 'Validation failed';
    errors = error.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    }));
  } else if (error instanceof MongooseError.ValidationError) {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  } else if (error instanceof MongooseError.CastError) {
    statusCode = 400;
    message = `Invalid value for "${error.path}"`;
  } else if (isDuplicateKeyError(error)) {
    statusCode = 409;
    const field = extractDuplicateField(error);
    message = field ? `A record with that ${field} already exists` : 'Duplicate record';
  } else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'Malformed JSON in request body';
  } else if (error instanceof Error) {
    message = env.isProduction && statusCode === 500 ? 'Internal server error' : error.message;
  }

  if (statusCode >= 500) {
    logger.error({ err: error, method: req.method, url: req.originalUrl }, 'Unhandled error');
  } else {
    logger.warn(
      { statusCode, method: req.method, url: req.originalUrl, message },
      'Request rejected',
    );
  }

  const body: Record<string, unknown> = {
    success: false,
    message,
    ...(errors ? { errors } : {}),
  };

  if (!env.isProduction && statusCode >= 500) {
    body.stack = error instanceof Error ? error.stack : undefined;
  }

  res.status(statusCode).json(body);
};

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === 11000;

const extractDuplicateField = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  if (!keyPattern) return undefined;
  return Object.keys(keyPattern)[0];
};
