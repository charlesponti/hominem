import type { z } from 'zod'

export const OUTPUT_FORMATS = ['text', 'json', 'ndjson'] as const

export type OutputFormat = (typeof OUTPUT_FORMATS)[number]

export type ErrorCategory =
  | 'usage'
  | 'auth'
  | 'validation'
  | 'dependency'
  | 'internal'

export type ExitCode = 0 | 2 | 3 | 4 | 5 | 10

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface CommandSuccess<T> {
  ok: true
  command: string
  timestamp: string
  data: T
  message?: string
}

export interface CommandFailure {
  ok: false
  command: string
  timestamp: string
  code: string
  category: ErrorCategory
  message: string
  details?: JsonValue
  hint?: string
  requestId?: string
}

export interface ProgressEvent {
  type: 'progress'
  command: string
  timestamp: string
  phase: string
  message: string
}

export interface DiagnosticEvent {
  type: 'diagnostic'
  command: string
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  data?: JsonValue
}

export interface CommandContext {
  cwd: string
  env: NodeJS.ProcessEnv
  stdio: {
    out: NodeJS.WriteStream
    err: NodeJS.WriteStream
  }
  outputFormat: OutputFormat
  quiet: boolean
  verbose: boolean
  interactive: boolean
  telemetry: {
    requestId: string
    startedAt: string
  }
  abortSignal: AbortSignal
}

export interface CommandDefinition<TArgs extends z.ZodTypeAny, TFlags extends z.ZodTypeAny, TOutput> {
  name: string
  summary: string
  description: string
  args: TArgs
  flags: TFlags
  argNames: string[]
  outputSchema: z.ZodType<TOutput>
  errorMap?: Record<string, { category: ErrorCategory; hint?: string }>
  run: (input: {
    args: z.infer<TArgs>
    flags: z.infer<TFlags>
    context: CommandContext
  }) => Promise<TOutput>
}

export interface CommandModule {
  default: CommandDefinition<z.ZodTypeAny, z.ZodTypeAny, JsonValue>
}

export interface CommandRoute {
  id: string
  summary: string
  description: string
  loader: () => Promise<CommandModule>
}
