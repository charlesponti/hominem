import type { BaseClientEnv } from './schema';
import { baseClientSchema } from './schema';

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
      'baseClientEnv'
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
 * Creates a validated client environment
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
 * Base client environment with shared infrastructure variables
 * Use in: Simple cases or extend for app-specific needs
 * 
 * For app-specific variables, create your own:
 * ```typescript
 * import { baseClientSchema } from '@hominem/env/schema';
 * const mySchema = baseClientSchema.extend({ VITE_MY_VAR: z.string() });
 * export const clientEnv = mySchema.parse(import.meta.env);
 * ```
 */
export const baseClientEnv: BaseClientEnv = createClientEnv(baseClientSchema, 'baseClientEnv');

// Re-export types and schemas for apps to extend
export type { BaseClientEnv };
export { baseClientSchema } from './schema';
