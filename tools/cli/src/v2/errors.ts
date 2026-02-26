import type { ErrorCategory, ExitCode } from './contracts'
import type { JsonValue } from './contracts'

export class CliError extends Error {
  code: string
  category: ErrorCategory
  details?: JsonValue
  hint?: string

  constructor(params: {
    code: string
    category: ErrorCategory
    message: string
    details?: JsonValue
    hint?: string
  }) {
    super(params.message)
    this.name = 'CliError'
    this.code = params.code
    this.category = params.category
    this.details = params.details
    this.hint = params.hint
  }
}

export function toExitCode(category: ErrorCategory): ExitCode {
  switch (category) {
    case 'usage':
      return 2
    case 'auth':
      return 3
    case 'validation':
      return 4
    case 'dependency':
      return 5
    case 'internal':
    default:
      return 10
  }
}
