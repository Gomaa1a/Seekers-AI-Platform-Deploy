import { Request, Response, NextFunction } from 'express';
import { logger } from '../config';
import { ApiResponse } from '../types';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found error
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

/**
 * Validation error
 */
export class ValidationError extends ApiError {
  constructor(
    message: string = 'Validation failed',
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message, 400, true, errors);
  }
}

/**
 * Conflict error (e.g., duplicate entry)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  if (err instanceof ApiError && err.isOperational) {
    logger.warn('Operational error', {
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unexpected error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Determine status code
  const statusCode = err instanceof ApiError ? err.statusCode : 500;

  // Build response
  const response: ApiResponse = {
    success: false,
    error: err instanceof ApiError && err.isOperational
      ? err.message
      : 'An unexpected error occurred. Please try again later.',
  };

  // Include validation errors if present
  if (err instanceof ApiError && err.errors) {
    response.errors = err.errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && !(err instanceof ApiError && err.isOperational)) {
    (response as any).stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Not found handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
