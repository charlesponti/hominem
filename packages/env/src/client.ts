import type { RoccoClientEnv, NotesClientEnv, FinanceClientEnv } from './schema';
import { roccoClientSchema, notesClientSchema, financeClientSchema } from './schema';

/**
 * Error class for environment validation failures
 */
export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly issues?: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validates that we're in a browser/client context
 */
function assertClientContext(): void {
  if (typeof window === 'undefined' || typeof import.meta === 'undefined') {
    throw new EnvValidationError(
      'clientEnv can only be used in browser/client context. ' +
      'Use serverEnv for server-side code.',
      'clientEnv'
    );
  }
}

/**
 * Formats Zod validation errors into a readable format
 */
function formatZodError(error: unknown, context: string): EnvValidationError {
  if (error instanceof Error && 'issues' in error) {
    const issues = (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
    const formattedIssues = issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    const message = `Environment validation failed:\n${formattedIssues
      .map((i) => `  - ${i.path}: ${i.message}`)
      .join('\n')}`;

    return new EnvValidationError(message, context, formattedIssues);
  }

  return new EnvValidationError(
    `Environment validation failed: ${error instanceof Error ? error.message : String(error)}`,
    context
  );
}

/**
 * Creates a validated client environment for a specific app schema
 */
function createClientEnv<T>(schema: { parse: (data: unknown) => T }, context: string): T {
  assertClientContext();

  try {
    return schema.parse(import.meta.env);
  } catch (error) {
    throw formatZodError(error, context);
  }
}

/**
 * Rocco app client environment
 * Use in: apps/rocco browser components
 */
export const roccoClientEnv: RoccoClientEnv = createClientEnv(roccoClientSchema, 'roccoClientEnv');

/**
 * Notes app client environment
 * Use in: apps/notes browser components
 */
export const notesClientEnv: NotesClientEnv = createClientEnv(notesClientSchema, 'notesClientEnv');

/**
 * Finance app client environment
 * Use in: apps/finance browser components
 */
export const financeClientEnv: FinanceClientEnv = createClientEnv(
  financeClientSchema,
  'financeClientEnv'
);

// Re-export types
export type { RoccoClientEnv, NotesClientEnv, FinanceClientEnv };
