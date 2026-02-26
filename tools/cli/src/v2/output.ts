import type { CommandFailure, CommandSuccess, OutputFormat } from './contracts'

export function writeSuccess<T>(format: OutputFormat, payload: CommandSuccess<T>, stdout: NodeJS.WriteStream) {
  if (format === 'json') {
    stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
    return
  }

  if (format === 'ndjson') {
    stdout.write(`${JSON.stringify(payload)}\n`)
    return
  }

  if (payload.message) {
    stdout.write(`${payload.message}\n`)
  }
  stdout.write(`${JSON.stringify(payload.data, null, 2)}\n`)
}

export function writeFailure(format: OutputFormat, payload: CommandFailure, stderr: NodeJS.WriteStream) {
  if (format === 'json') {
    stderr.write(`${JSON.stringify(payload, null, 2)}\n`)
    return
  }

  if (format === 'ndjson') {
    stderr.write(`${JSON.stringify(payload)}\n`)
    return
  }

  stderr.write(`${payload.code}: ${payload.message}\n`)
  if (payload.hint) {
    stderr.write(`Hint: ${payload.hint}\n`)
  }
  if (payload.details) {
    stderr.write(`${JSON.stringify(payload.details, null, 2)}\n`)
  }
}
