import * as z from 'zod'

export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly issues?: Array<{ path: string; message: string }>
  ) {
    super(message)
    this.name = 'EnvValidationError'
  }
}

function createEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  getSource: () => Record<string, string | undefined>,
  ctx: string
): z.infer<T> {
  type Env = z.infer<T>
  let cache: Env | undefined

  const resolve = (): Env => {
    cache ??= (() => {
      try {
        return schema.parse(getSource())
      } catch (err) {
        if (err instanceof z.ZodError) {
          const issues = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
          throw new EnvValidationError(
            `[${ctx}] validation failed:\n${issues.map((i) => `  ${i.path}: ${i.message}`).join('\n')}`,
            ctx,
            issues
          )
        }
        throw new EnvValidationError(
          `[${ctx}] ${err instanceof Error ? err.message : String(err)}`,
          ctx
        )
      }
    })()
    return cache
  }

  return new Proxy({} as Record<PropertyKey, unknown>, {
    get: (_, k) => resolve()[k as keyof Env],
    has: (_, k) => k in resolve(),
    ownKeys: () => Object.keys(resolve()),
    getOwnPropertyDescriptor: (_, k) => {
      const env = resolve()
      if (k in env) return { enumerable: true, configurable: true, value: env[k as keyof Env] }
      return undefined
    },
  }) as Env
}

export function createClientEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  context = 'clientEnv'
): z.infer<T> {
  return createEnv(
    schema,
    () => {
      if (typeof window === 'undefined') {
        throw new EnvValidationError(
          'createClientEnv can only be used in browser context. Use createServerEnv for server-side code.',
          context
        )
      }
      return (import.meta as { env?: Record<string, string | undefined> }).env ?? {}
    },
    context
  )
}

export function createServerEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  context = 'serverEnv'
): z.infer<T> {
  return createEnv(
    schema,
    () => {
      const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      if (typeof proc === 'undefined') {
        throw new EnvValidationError(
          'createServerEnv can only be used in Node.js context. Use createClientEnv for browser code.',
          context
        )
      }
      return proc.env ?? {}
    },
    context
  )
}

export { BRAND } from './brand'
export type { Brand } from './brand'

