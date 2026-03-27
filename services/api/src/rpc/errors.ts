export type {
  ServiceError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnavailableError,
  InternalError,
  RateLimitError,
  ErrorCode,
} from '@hominem/services/errors';

export {
  isServiceError,
  validation,
  notFound,
  unauthorized,
  forbidden,
  conflict,
  unavailable,
  internal,
  rateLimit,
  getHttpStatus,
  toHttpResponse,
  ok,
  fail,
} from '@hominem/services/errors';
