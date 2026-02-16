import type { RoccoServerEnv, NotesServerEnv, FinanceServerEnv } from './schema';
import { roccoServerSchema, notesServerSchema, financeServerSchema } from './schema';

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
 * Validates that we're in a Node.js/server context
 */
function assertServerContext(): void {
  if (typeof process === 'undefined') {
    throw new EnvValidationError(
      'serverEnv can only be used in Node.js/server context. ' +
      'Use clientEnv for browser/client code.',
      'serverEnv'
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
 * Creates a validated server environment for a specific app schema
 */
function createServerEnv<T>(schema: { parse: (data: unknown) => T }, context: string): T {
  assertServerContext();

  try {
    return schema.parse(process.env);
  } catch (error) {
    throw formatZodError(error, context);
  }
}

/**
 * Rocco app server environment
 * Use in: apps/rocco server loaders and API routes
 */
export const roccoServerEnv: RoccoServerEnv = createServerEnv(roccoServerSchema, 'roccoServerEnv');

/**
 * Notes app server environment
 * Use in: apps/notes server loaders and API routes
 */
export const notesServerEnv: NotesServerEnv = createServerEnv(notesServerSchema, 'notesServerEnv');

/**
 * Finance app server environment
 * Use in: apps/finance server loaders and API routes
 */
export const financeServerEnv: FinanceServerEnv = createServerEnv(
  financeServerSchema,
  'financeServerEnv'
);

/**
 * Generic server environment (for services/api and other backend services)
 * Uses the base server schema without app-specific extensions
 */
export const serverEnv: FinanceServerEnv = createServerEnv(financeServerSchema, 'serverEnv');

// Re-export types
export type { RoccoServerEnv, NotesServerEnv, FinanceServerEnv };
