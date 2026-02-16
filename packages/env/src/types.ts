// Re-export all types from schema
export type {
  BaseClientEnv,
  BaseServerEnv,
} from './schema';

// Re-export error type (defined in client.ts)
export { EnvValidationError } from './client';
