import { Request, Response, NextFunction } from 'express';
import { ErrorLogRepository } from '../repositories/ErrorLogRepository';

const errorLogRepo = new ErrorLogRepository();

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public suggestions?: string[];
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    suggestions?: string[],
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.suggestions = suggestions;
    this.details = details;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
}

/**
 * Format error response
 */
export function formatErrorResponse(
  code: string,
  message: string,
  suggestions?: string[],
  details?: any
): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code,
      message,
    },
  };

  if (suggestions && suggestions.length > 0) {
    response.error.suggestions = suggestions;
  }

  if (details !== undefined) {
    response.error.details = details;
  }

  return response;
}

/**
 * Centralized error handling middleware
 * This should be the last middleware in the chain
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error to console
  console.error('Error occurred:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  // Log error to database asynchronously (don't block response)
  logErrorToDatabase(err, req).catch(logError => {
    console.error('Failed to log error to database:', logError);
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    const response = formatErrorResponse(
      err.code,
      err.message,
      err.suggestions,
      process.env.NODE_ENV === 'development' ? err.details : undefined
    );
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle specific error types
  const errorResponse = categorizeError(err);
  res.status(errorResponse.statusCode).json(
    formatErrorResponse(
      errorResponse.code,
      errorResponse.message,
      errorResponse.suggestions,
      process.env.NODE_ENV === 'development' ? err.message : undefined
    )
  );
}

/**
 * Log error to database
 */
async function logErrorToDatabase(err: Error, req: Request): Promise<void> {
  try {
    await errorLogRepo.create({
      userId: req.user?.userId,
      requestText: req.body?.request || JSON.stringify(req.body),
      errorMessage: err.message,
      errorStack: err.stack,
    });
  } catch (error) {
    // Silently fail - we don't want logging errors to break the app
    console.error('Error logging failed:', error);
  }
}

/**
 * Categorize errors and provide user-friendly messages
 */
function categorizeError(err: Error): {
  statusCode: number;
  code: string;
  message: string;
  suggestions?: string[];
} {
  const errorMessage = err.message.toLowerCase();

  // Database errors
  if (errorMessage.includes('database') || errorMessage.includes('connection')) {
    return {
      statusCode: 503,
      code: 'DATABASE_ERROR',
      message: 'Database service is temporarily unavailable',
      suggestions: [
        'Please try again in a few moments',
        'If the problem persists, contact support',
      ],
    };
  }

  // LLM service errors
  if (errorMessage.includes('llm') || errorMessage.includes('openai')) {
    return {
      statusCode: 503,
      code: 'LLM_SERVICE_UNAVAILABLE',
      message: 'The code generation service is temporarily unavailable',
      suggestions: [
        'Please try again in a few moments',
        'If the problem persists, contact support',
      ],
    };
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      statusCode: 504,
      code: 'REQUEST_TIMEOUT',
      message: 'The request took too long to process',
      suggestions: [
        'Try simplifying your request',
        'Break complex requests into smaller parts',
        'Try again later',
      ],
    };
  }

  // Context/version errors
  if (errorMessage.includes('no context') || errorMessage.includes('version')) {
    return {
      statusCode: 404,
      code: 'NO_CONTEXT',
      message: 'No context found for the specified version',
      suggestions: [
        'Ensure DDL files and documentation are uploaded for the selected version',
        'Verify the version ID is correct',
        'Contact an administrator to upload the necessary files',
      ],
    };
  }

  // File storage errors
  if (errorMessage.includes('minio') || errorMessage.includes('storage')) {
    return {
      statusCode: 503,
      code: 'STORAGE_ERROR',
      message: 'File storage service is temporarily unavailable',
      suggestions: [
        'Please try again in a few moments',
        'If uploading files, try a smaller file size',
      ],
    };
  }

  // Vector database errors
  if (errorMessage.includes('qdrant') || errorMessage.includes('vector')) {
    return {
      statusCode: 503,
      code: 'VECTOR_DB_ERROR',
      message: 'Search service is temporarily unavailable',
      suggestions: [
        'Please try again in a few moments',
        'If the problem persists, contact support',
      ],
    };
  }

  // Cache errors (Redis)
  if (errorMessage.includes('redis') || errorMessage.includes('cache')) {
    return {
      statusCode: 503,
      code: 'CACHE_ERROR',
      message: 'Cache service is temporarily unavailable',
      suggestions: [
        'The system will continue to work without caching',
        'Performance may be slower than usual',
      ],
    };
  }

  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The provided data is invalid',
      suggestions: [
        'Check your input and try again',
        'Ensure all required fields are provided',
      ],
    };
  }

  // Authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
    return {
      statusCode: 401,
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed',
      suggestions: [
        'Please log in again',
        'Verify your credentials are correct',
      ],
    };
  }

  // Authorization errors
  if (errorMessage.includes('forbidden') || errorMessage.includes('permission')) {
    return {
      statusCode: 403,
      code: 'AUTHORIZATION_ERROR',
      message: 'You do not have permission to perform this action',
      suggestions: [
        'Contact an administrator for access',
        'Verify you are logged in with the correct account',
      ],
    };
  }

  // Not found errors
  if (errorMessage.includes('not found')) {
    return {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      suggestions: [
        'Verify the resource ID is correct',
        'The resource may have been deleted',
      ],
    };
  }

  // Generic server error
  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    suggestions: [
      'Please try again',
      'If the problem persists, contact support',
    ],
  };
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handling middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * Should be placed before the error handler middleware
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'ROUTE_NOT_FOUND',
    [
      'Check the API documentation for available endpoints',
      'Verify the request method and path are correct',
    ]
  );
  next(error);
}
