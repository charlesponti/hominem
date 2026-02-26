import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'bun:test'

import { runCli } from '../../../src/v2/runtime'

type OutputFormat = 'text' | 'json' | 'ndjson'

interface CommandContractCase {
  name: string
  argv: string[]
  expectedCommand: string
  expectedExitCodes: number[]
  assertSuccess?: (structured: SuccessEnvelope) => void
}

interface CapturedRun {
  exitCode: number
  stdout: string
  stderr: string
}

interface SuccessEnvelope {
  ok: true
  command: string
  timestamp: string
  data: Record<string, string | number | boolean | null | Record<string, string> | string[] | Record<string, string | number | boolean | null>[]>
}

interface FailureEnvelope {
  ok: false
  command: string
  timestamp: string
  code: string
  category: string
  message: string
}

const formats: OutputFormat[] = ['text', 'json', 'ndjson']
const categories = ['usage', 'auth', 'validation', 'dependency', 'internal']

async function withCwd<T>(cwd: string, run: () => Promise<T>): Promise<T> {
  const previous = process.cwd()
  process.chdir(cwd)
  try {
    return await run()
  } finally {
    process.chdir(previous)
  }
}

async function withIsolatedPaths<T>(hominemHome: string, run: () => Promise<T>): Promise<T> {
  const previousHome = process.env.HOME
  const previousUserProfile = process.env.USERPROFILE
  const previousHominemHome = process.env.HOMINEM_HOME

  process.env.HOME = hominemHome
  process.env.USERPROFILE = hominemHome
  process.env.HOMINEM_HOME = hominemHome

  try {
    return await run()
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = previousHome
    }

    if (previousUserProfile === undefined) {
      delete process.env.USERPROFILE
    } else {
      process.env.USERPROFILE = previousUserProfile
    }

    if (previousHominemHome === undefined) {
      delete process.env.HOMINEM_HOME
    } else {
      process.env.HOMINEM_HOME = previousHominemHome
    }
  }
}

function normalizeChunk(chunk: string | Uint8Array): string {
  if (typeof chunk === 'string') {
    return chunk
  }
  return Buffer.from(chunk).toString('utf-8')
}

async function runCaptured(argv: string[]): Promise<CapturedRun> {
  let stdout = ''
  let stderr = ''

  const originalStdoutWrite = process.stdout.write.bind(process.stdout)
  const originalStderrWrite = process.stderr.write.bind(process.stderr)

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += normalizeChunk(chunk)
    return true
  }) as typeof process.stdout.write

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += normalizeChunk(chunk)
    return true
  }) as typeof process.stderr.write

  try {
    const result = await runCli(argv)
    return {
      exitCode: result.exitCode,
      stdout,
      stderr
    }
  } finally {
    process.stdout.write = originalStdoutWrite
    process.stderr.write = originalStderrWrite
  }
}

function parseStructuredOutput(format: OutputFormat, result: CapturedRun): SuccessEnvelope | FailureEnvelope | null {
  if (format === 'text') {
    return null
  }

  const stream = result.exitCode === 0 ? result.stdout : result.stderr
  const raw = format === 'ndjson' ? stream.trim().split('\n')[0] : stream
  return JSON.parse(raw) as SuccessEnvelope | FailureEnvelope
}

function buildCases(): CommandContractCase[] {
  return [
    { name: 'auth root', argv: ['auth'], expectedCommand: 'auth', expectedExitCodes: [0] },
    { name: 'auth login machine failure', argv: ['auth', 'login', '--device', '--base-url', 'http://127.0.0.1:1'], expectedCommand: 'auth login', expectedExitCodes: [3] },
    { name: 'auth status', argv: ['auth', 'status'], expectedCommand: 'auth status', expectedExitCodes: [0] },
    { name: 'config root', argv: ['config'], expectedCommand: 'config', expectedExitCodes: [0] },
    {
      name: 'config init',
      argv: ['config', 'init'],
      expectedCommand: 'config init',
      expectedExitCodes: [0],
      assertSuccess: (structured) => {
        const outputPath = structured.data.path
        if (typeof outputPath !== 'string') {
          throw new Error('config init did not return path')
        }
        expect(outputPath.startsWith(process.env.HOMINEM_HOME ?? '')).toBeTrue()
      }
    },
    { name: 'config set', argv: ['config', 'set', 'output.format', 'json'], expectedCommand: 'config set', expectedExitCodes: [0] },
    { name: 'config get', argv: ['config', 'get', 'output.format'], expectedCommand: 'config get', expectedExitCodes: [0] },
    { name: 'system root', argv: ['system'], expectedCommand: 'system', expectedExitCodes: [0] },
    { name: 'system doctor', argv: ['system', 'doctor'], expectedCommand: 'system doctor', expectedExitCodes: [0] },
    { name: 'system generate command', argv: ['system', 'generate', 'command', 'temp', 'demo'], expectedCommand: 'system generate command', expectedExitCodes: [0] },
    { name: 'system plugin call validation', argv: ['system', 'plugin', 'call'], expectedCommand: 'system plugin call', expectedExitCodes: [4] },
    { name: 'ai root', argv: ['ai'], expectedCommand: 'ai', expectedExitCodes: [0] },
    { name: 'ai models', argv: ['ai', 'models', '--base-url', 'http://127.0.0.1:1'], expectedCommand: 'ai models', expectedExitCodes: [3] },
    { name: 'ai invoke', argv: ['ai', 'invoke', 'hello', '--base-url', 'http://127.0.0.1:1'], expectedCommand: 'ai invoke', expectedExitCodes: [3] },
    { name: 'ai ping', argv: ['ai', 'ping', '--base-url', 'http://127.0.0.1:1'], expectedCommand: 'ai ping', expectedExitCodes: [5] },
    { name: 'data root', argv: ['data'], expectedCommand: 'data', expectedExitCodes: [0] },
    { name: 'data accounts', argv: ['data', 'accounts', '--base-url', 'http://127.0.0.1:1'], expectedCommand: 'data accounts', expectedExitCodes: [3] },
    { name: 'data profiles', argv: ['data', 'profiles'], expectedCommand: 'data profiles', expectedExitCodes: [0] },
    { name: 'files root', argv: ['files'], expectedCommand: 'files', expectedExitCodes: [0] },
    { name: 'files inventory', argv: ['files', 'inventory', '.'], expectedCommand: 'files inventory', expectedExitCodes: [0] },
    { name: 'files head', argv: ['files', 'head', 'README.md', '--lines', '5'], expectedCommand: 'files head', expectedExitCodes: [0] },
    { name: 'files rename-markdown', argv: ['files', 'rename-markdown', '.', '--dry-run', '--limit', '1'], expectedCommand: 'files rename-markdown', expectedExitCodes: [0] },
    { name: 'agent root', argv: ['agent'], expectedCommand: 'agent', expectedExitCodes: [0] },
    { name: 'agent status', argv: ['agent', 'status'], expectedCommand: 'agent status', expectedExitCodes: [0] },
    { name: 'agent health', argv: ['agent', 'health', '--port', '1'], expectedCommand: 'agent health', expectedExitCodes: [5] },
    { name: 'unknown command', argv: ['missing', 'command'], expectedCommand: 'missing command', expectedExitCodes: [2] }
  ]
}

describe('v2 command contracts', () => {
  it('enforces envelope and exit-code contracts across formats', async () => {
    const cliRoot = process.cwd()
    const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hominem-cli-contract-'))
    const hominemHome = path.join(sandboxRoot, 'home')
    fs.mkdirSync(hominemHome, { recursive: true })
    fs.mkdirSync(path.join(sandboxRoot, 'tools', 'cli'), { recursive: true })

    const cases = buildCases()

    await withIsolatedPaths(hominemHome, async () => {
      for (const format of formats) {
        for (const testCase of cases) {
          const cwd = testCase.name === 'system generate command' ? sandboxRoot : cliRoot
          const result = await withCwd(cwd, async () => runCaptured([...testCase.argv, '--format', format]))

          expect(testCase.expectedExitCodes.includes(result.exitCode)).toBeTrue()

          if (format === 'text') {
            if (result.exitCode === 0) {
              expect(result.stdout.length > 0).toBeTrue()
            } else {
              expect(result.stderr.length > 0).toBeTrue()
            }
            continue
          }

          const structured = parseStructuredOutput(format, result)
          expect(structured).not.toBeNull()
          if (!structured) {
            continue
          }

          expect(typeof structured.timestamp).toBe('string')
          expect(structured.command).toBe(testCase.expectedCommand)

          if (result.exitCode === 0) {
            expect(structured.ok).toBeTrue()
            if (structured.ok) {
              expect(typeof structured.data).toBe('object')
              testCase.assertSuccess?.(structured)
            }
          } else {
            expect(structured.ok).toBeFalse()
            if (!structured.ok) {
              expect(typeof structured.code).toBe('string')
              expect(categories.includes(structured.category)).toBeTrue()
              expect(typeof structured.message).toBe('string')
            }
          }
        }
      }
    })
  })
})
