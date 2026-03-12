import { describe, expect, it } from 'bun:test'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

import type { CommandSuccess, JsonValue } from '../../src/contracts'

type OutputFormat = 'json' | 'ndjson'

interface CapturedRun {
  exitCode: number
  stdout: string
  stderr: string
}

interface NormalizedSuccessEnvelope {
  ok: true
  command: string
  timestamp: string
  message: string | undefined
  data: JsonValue
}

function normalizeChunk(chunk: string | Uint8Array): string {
  if (typeof chunk === 'string') {
    return chunk
  }
  return Buffer.from(chunk).toString('utf-8')
}

function createCliEnv(hominemHome: string, extraEnv?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...extraEnv,
    HOME: hominemHome,
    USERPROFILE: hominemHome,
    HOMINEM_HOME: hominemHome,
    HOMINEM_DISABLE_KEYTAR: '1',
  }
}

async function runCapturedSubprocess(
  argv: string[],
  options: {
    cwd: string
    env: NodeJS.ProcessEnv
  },
): Promise<CapturedRun> {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['run', './src/cli.ts', ...argv], {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: string | Uint8Array) => {
      stdout += normalizeChunk(chunk)
    })
    child.stderr.on('data', (chunk: string | Uint8Array) => {
      stderr += normalizeChunk(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      })
    })
  })
}

async function runCliCommand(
  cliRoot: string,
  hominemHome: string,
  argv: string[],
  extraEnv?: NodeJS.ProcessEnv,
) {
  return runCapturedSubprocess(argv, {
    cwd: cliRoot,
    env: createCliEnv(hominemHome, extraEnv),
  })
}

async function withSessionProbeServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = http.createServer((request, response) => {
    if (request.url === '/api/auth/session') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ isAuthenticated: true }))
      return
    }

    response.writeHead(404, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: 'not_found' }))
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Failed to bind session probe server')
  }

  try {
    return await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  }
}

function parseSuccessEnvelope(format: OutputFormat, stdout: string): CommandSuccess<JsonValue> {
  const raw = format === 'ndjson' ? stdout.trim().split('\n')[0] : stdout
  return JSON.parse(raw) as CommandSuccess<JsonValue>
}

function normalizeEnvelope(
  input: CommandSuccess<JsonValue>,
  hominemHome: string,
): NormalizedSuccessEnvelope {
  const normalizedString = JSON.stringify(input.data).replaceAll(hominemHome, '<hominem-home>')
  return {
    ok: true,
    command: input.command,
    timestamp: '<timestamp>',
    message: input.message,
    data: JSON.parse(normalizedString) as JsonValue,
  }
}

describe('v2 output contract snapshots', () => {
  it('matches normalized json/ndjson envelopes for core commands', async () => {
    const cliRoot = process.cwd()
    const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hominem-output-contract-'))
    const hominemHome = path.join(sandboxRoot, 'home')
    fs.mkdirSync(hominemHome, { recursive: true })

    for (const format of ['json', 'ndjson'] as const) {
      const configInit = await runCliCommand(cliRoot, hominemHome, [
        'config',
        'init',
        '--format',
        format,
      ])
      expect(configInit.exitCode).toBe(0)

      const configSet = await runCliCommand(cliRoot, hominemHome, [
        'config',
        'set',
        'output.format',
        '"json"',
        '--format',
        format,
      ])
      expect(configSet.exitCode).toBe(0)
      expect(
        normalizeEnvelope(parseSuccessEnvelope(format, configSet.stdout), hominemHome),
      ).toEqual({
        ok: true,
        command: 'config set',
        timestamp: '<timestamp>',
        message: 'Set config values',
        data: {
          updatedPath: 'output.format',
          value: 'json',
        },
      } satisfies NormalizedSuccessEnvelope)

      const configGet = await runCliCommand(cliRoot, hominemHome, [
        'config',
        'get',
        'output.format',
        '--format',
        format,
      ])
      expect(configGet.exitCode).toBe(0)
      expect(
        normalizeEnvelope(parseSuccessEnvelope(format, configGet.stdout), hominemHome),
      ).toEqual({
        ok: true,
        command: 'config get',
        timestamp: '<timestamp>',
        message: 'Get config values',
        data: {
          value: 'json',
        },
      } satisfies NormalizedSuccessEnvelope)

      const authStatus = await runCliCommand(cliRoot, hominemHome, [
        'auth',
        'status',
        '--format',
        format,
      ])
      expect(authStatus.exitCode).toBe(0)
      expect(
        normalizeEnvelope(parseSuccessEnvelope(format, authStatus.stdout), hominemHome),
      ).toEqual({
        ok: true,
        command: 'auth status',
        timestamp: '<timestamp>',
        message: 'Show authentication status',
        data: {
          authenticated: false,
          tokenStored: false,
          tokenVersion: null,
          provider: null,
          issuerBaseUrl: null,
          expiresAt: null,
          ttlSeconds: null,
          scopes: [],
        },
      } satisfies NormalizedSuccessEnvelope)

      const systemDoctor = await runCliCommand(cliRoot, hominemHome, [
        'system',
        'doctor',
        '--format',
        format,
      ])
      expect(systemDoctor.exitCode).toBe(0)
      const normalizedDoctor = normalizeEnvelope(
        parseSuccessEnvelope(format, systemDoctor.stdout),
        hominemHome,
      )
      const doctorData = normalizedDoctor.data as {
        checks: Array<{ id: string; status: string; message: string }>
      }
      expect(normalizedDoctor.ok).toBeTrue()
      expect(normalizedDoctor.command).toBe('system doctor')
      expect(normalizedDoctor.timestamp).toBe('<timestamp>')
      expect(normalizedDoctor.message).toBe('Run CLI diagnostics')
      expect(Array.isArray(doctorData.checks)).toBeTrue()
      expect(
        doctorData.checks.some((check) => check.id === 'runtime.node' && check.status === 'pass'),
      ).toBeTrue()
      expect(
        doctorData.checks.some(
          (check) =>
            check.id === 'config.v2' &&
            check.status === 'pass' &&
            check.message === 'config version 2',
        ),
      ).toBeTrue()
      expect(
        doctorData.checks.some((check) => check.id === 'auth.token' && check.status === 'warn'),
      ).toBeTrue()

      await withSessionProbeServer(async (baseUrl) => {
        fs.writeFileSync(
          path.join(hominemHome, 'tokens.json'),
          JSON.stringify({
            tokenVersion: 2,
            accessToken: 'stored-bearer',
            issuerBaseUrl: baseUrl,
            provider: 'better-auth',
          }),
        )

        const authenticatedDoctor = await runCliCommand(cliRoot, hominemHome, [
          'system',
          'doctor',
          '--format',
          format,
        ])
        expect(authenticatedDoctor.exitCode).toBe(0)

        const authenticatedPayload = normalizeEnvelope(
          parseSuccessEnvelope(format, authenticatedDoctor.stdout),
          hominemHome,
        )
        const authenticatedData = authenticatedPayload.data as {
          checks: Array<{ id: string; status: string; message: string }>
        }

        expect(
          authenticatedData.checks.some(
            (check) => check.id === 'auth.session' && check.status === 'pass',
          ),
        ).toBeTrue()

        fs.rmSync(path.join(hominemHome, 'tokens.json'), { force: true })
      })
    }
  })
})
