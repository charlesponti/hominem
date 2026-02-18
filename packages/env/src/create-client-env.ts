import * as z from 'zod';

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

export function createClientEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  context?: string
): z.infer<T> {
  type EnvType = z.infer<T>;
  const ctx = context || 'clientEnv';

  let validated: EnvType | null = null;

  function getEnv(): EnvType {
    if (validated) return validated;

    const hasWindow = typeof (globalThis as { window?: unknown }).window !== 'undefined';
    const hasImportMeta = typeof (globalThis as { importMeta?: { env?: Record<string, string | undefined> } }).importMeta !== 'undefined';

    if (!hasWindow || !hasImportMeta) {
      throw new EnvValidationError(
        'clientEnv can only be used in browser/client context. ' +
        'Use serverEnv for server-side code.',
        ctx
      );
    }

    try {
      const importMeta = (globalThis as { importMeta?: { env?: Record<string, string | undefined> } }).importMeta;
      validated = schema.parse(importMeta?.env ?? {});
      return validated;
    } catch (error) {
      throw formatZodError(error, ctx);
    }
  }

  const _env: Record<string, unknown> = {};
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
  }) as EnvType;
}
