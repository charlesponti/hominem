// Re-export all types from schema
export type {
  // Base types
  BaseClientEnv,
  BaseServerEnv,
  
  // Rocco app types
  RoccoClientEnv,
  RoccoServerEnv,
  
  // Notes app types
  NotesClientEnv,
  NotesServerEnv,
  
  // Finance app types
  FinanceClientEnv,
  FinanceServerEnv,
} from './schema';

// Re-export error type
export { EnvValidationError } from './client';
export { EnvValidationError as ServerEnvValidationError } from './server';
