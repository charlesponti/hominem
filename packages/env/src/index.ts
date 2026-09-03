import { z } from 'zod';

type EnvSource = Record<string, string | undefined>;

function isEnvSource(value: unknown): value is EnvSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((item) => typeof item === 'string' || item === undefined)
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

  const source = Reflect.get(import.meta, 'env');
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

export { apiSchema } from './api';
export type { ApiEnv } from './api';
export { baseSchema } from './base';
export type { BaseEnv } from './base';
export { BRAND } from './brand';
export type { Brand } from './brand';
export { webClientSchema, webSchema } from './web';
export type { WebClientEnv, WebEnv } from './web';
