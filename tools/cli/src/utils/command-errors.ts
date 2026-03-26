import type { Command } from '@oclif/core'

type CommandLike = Pick<Command, 'error'>

interface CommandErrorOptions {
  exit?: number
  code?: string
}

function getErrorMessage(error: Error | string | undefined): string {
  if (typeof error === 'string') {
    return error
  }

  return error?.message ?? 'Unknown error'
}

export function failCommand(
  command: CommandLike,
  action: string,
  error: Error | string | undefined,
  options?: CommandErrorOptions,
): never {
  command.error(`${action}: ${getErrorMessage(error)}`, {
    exit: options?.exit ?? 1,
    code: options?.code,
  })
}