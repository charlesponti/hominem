import * as z from 'zod';
import { EnvValidationError } from './create-client-env';

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

export function createServerEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  context?: string
): z.infer<T> {
  type EnvType = z.infer<T>;
  const ctx = context || 'serverEnv';

  let validated: EnvType | null = null;

  function getEnv(): EnvType {
    if (validated) return validated;

    if (typeof (globalThis as any).process === 'undefined') {
      throw new EnvValidationError(
        'serverEnv can only be used in Node.js/server context. ' +
        'Use clientEnv for browser/client code.',
        ctx
      );
    }

    try {
      validated = schema.parse((globalThis as any).process.env);
      return validated;
    } catch (error) {
      throw formatZodError(error, ctx);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _env: any = {};
  return new Proxy(_env, {
    get(target, prop) {
      return getEnv()[prop as keyof EnvType];
    },
    has(target, prop) {
      return prop in getEnv();
    },
    ownKeys(target) {
      return Object.keys(getEnv());
    },
    getOwnPropertyDescriptor(target, prop) {
      const env = getEnv();
      if (prop in env) {
        return {
          enumerable: true,
          configurable: true,
          value: env[prop as keyof EnvType],
        };
      }
      return undefined;
    },
  });
}
