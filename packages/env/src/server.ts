import type { BaseServerEnv } from './schema';
import { baseServerSchema } from './schema';

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
      'baseServerEnv'
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
 * Creates a validated server environment
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
 * Base server environment with shared infrastructure variables
 * Use in: Simple cases or extend for app-specific needs
 * 
 * For app-specific variables, create your own:
 * ```typescript
 * import { baseServerSchema } from '@hominem/env/schema';
 * const mySchema = baseServerSchema.extend({ MY_SECRET: z.string() });
 * export const serverEnv = mySchema.parse(process.env);
 * ```
 */
export const baseServerEnv: BaseServerEnv = createServerEnv(baseServerSchema, 'baseServerEnv');

// Re-export types and schemas for apps to extend
export type { BaseServerEnv };
export { baseServerSchema } from './schema';
