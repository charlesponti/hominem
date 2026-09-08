// Error classes for database services. Internal to @hominem/db - used by
// services that need to throw errors the API layer can catch.

import { z } from 'zod';

const errorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INTERNAL_ERROR',
  'UNAVAILABLE',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export class ServiceError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ServiceError.prototype);
    // `this.constructor.name` would read back 'ServiceError' here, since the
    // line above just reset this instance's prototype to ServiceError's —
    // ahead of the subclass's own Object.setPrototypeOf fixing it back.
    // `new.target` names whichever constructor `new` was actually called
    // with (e.g. NotFoundError), independent of that timing.
    this.name = new.target.name;
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', 401, details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', 403, details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class UnavailableError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'UNAVAILABLE', 503, details);
    Object.setPrototypeOf(this, UnavailableError.prototype);
  }
}

export class InternalError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INTERNAL_ERROR', 500, details);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

// Matches the duck-typed shape of a ServiceError — used for errors that
// cross a serialization boundary (e.g. a worker/queue payload) and so
// aren't `instanceof ServiceError` even though they came from one.
// `details` isn't validated: callers only need message/code/statusCode to
// treat something as a service error.
const serviceErrorShapeSchema = z.object({
  message: z.string(),
  code: errorCodeSchema,
  statusCode: z.number().int().min(400).max(599),
});

export function isServiceError(value: unknown): value is ServiceError {
  if (value instanceof ServiceError) {
    return true;
  }

  return serviceErrorShapeSchema.safeParse(value).success;
}
