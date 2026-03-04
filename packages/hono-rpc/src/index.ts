import type { AppContext } from './middleware/auth';

import { app } from './app';

export { app };

export type { AppType } from './app.type';

export type { AppContext };

// Re-export everything from @hominem/db (db client, utilities, services)
export * from '@hominem/db';

// Re-export errors for API routes (own implementation)
export {
  ServiceError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnavailableError,
  InternalError,
  isServiceError,
  type ErrorCode,
} from './errors';
