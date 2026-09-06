// just re-exporting the shared error types from @hominem/db
export {
  ForbiddenError,
  InternalError,
  isServiceError,
  NotFoundError,
  ServiceError,
  UnauthorizedError,
  UnavailableError,
  ValidationError,
  type ErrorCode,
} from '@hominem/db/errors';
