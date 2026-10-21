export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string = 'Too many requests', retryAfter: number = 60) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.retryAfter = retryAfter;
  }
}

export class IdempotencyError extends AppError {
  constructor(message: string = 'Idempotency key already processed') {
    super(message, 'IDEMPOTENCY_CONFLICT', 409);
  }
}

export class TenantError extends AppError {
  constructor(message: string, code: string = 'TENANT_ERROR') {
    super(message, code, 400);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError: Error) {
    super(
      `${service} service error: ${originalError.message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { service, originalMessage: originalError.message }
    );
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function handleError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof Error) {
    if (error.name === 'ZodError') {
      return new ValidationError('Validation failed', { zodError: error.message });
    }
    return new AppError(error.message, 'INTERNAL_ERROR', 500);
  }

  return new AppError('Unknown error', 'UNKNOWN_ERROR', 500);
}

export function errorResponse(error: AppError) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}