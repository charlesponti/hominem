import { z } from 'zod';

// Vite's own `import.meta.env` mixes real env strings with native booleans
// for its built-ins (DEV/PROD/SSR); Node's `process.env` is string-only. This
// guard accepts either shape and defers actual value validation to the
// caller's Zod schema — it only needs to confirm "this looks like an env
// object", not pre-validate every property.
type EnvSource = Record<string, string | boolean | undefined>;

function isEnvSource(value: unknown): value is EnvSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every(
      (item) => typeof item === 'string' || typeof item === 'boolean' || item === undefined,
    )
  );
}

export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

function parseEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  source: EnvSource,
  ctx: string,
): z.infer<T> {
  try {
    return schema.parse(source);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      throw new EnvValidationError(
        `[${ctx}] validation failed:\n${issues.map((i) => `  ${i.path}: ${i.message}`).join('\n')}`,
        ctx,
        issues,
      );
    }
    throw new EnvValidationError(
      `[${ctx}] ${err instanceof Error ? err.message : String(err)}`,
      ctx,
    );
  }
}

export function createClientEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  context = 'clientEnv',
): z.infer<T> {
  if (typeof Reflect.get(globalThis, 'window') === 'undefined') {
    throw new EnvValidationError(
      'createClientEnv can only be used in browser context. Use createServerEnv for server-side code.',
      context,
    );
  }

  // Vite's dev-mode transform only inlines real values for a literal
  // `import.meta.env` access; a Reflect.get indirection is invisible to that
  // static analysis and always resolves to an empty object in the browser.
  // Typed via a local cast instead of a global `ImportMeta.env` augmentation
  // — that global merge conflicted with Vite's own `ImportMetaEnv`-typed
  // declaration whenever both were visible in the same TS program (seen in
  // this package's own isolated typecheck task in CI).
  const source = (import.meta as ImportMeta & { env?: EnvSource }).env;
  return parseEnv(schema, isEnvSource(source) ? source : {}, context);
}

export function createServerEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  context = 'serverEnv',
): z.infer<T> {
  const proc = Reflect.get(globalThis, 'process');
  const candidateSource = proc && typeof proc === 'object' ? Reflect.get(proc, 'env') : undefined;
  const source = isEnvSource(candidateSource) ? candidateSource : {};

  if (typeof proc === 'undefined') {
    throw new EnvValidationError(
      'createServerEnv can only be used in Node.js context. Use createClientEnv for browser code.',
      context,
    );
  }

  return parseEnv(schema, source, context);
}

export { aiSchema } from './ai';
export type { AiEnv } from './ai';
export { databaseSchema } from './database';
export type { DatabaseEnv } from './database';
export { emailSchema } from './email';
export type { EmailEnv } from './email';
export { redisSchema } from './redis';
export type { RedisEnv } from './redis';
export { runtimeSchema } from './runtime';
export type { RuntimeEnv } from './runtime';
export { storageSchema } from './storage';
export type { StorageEnv } from './storage';
export { BRAND } from './brand';
export type { Brand } from './brand';
