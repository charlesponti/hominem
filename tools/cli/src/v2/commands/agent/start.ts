import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'
import { getHominemHomeDir } from '@/utils/paths'

function getRuntimePaths() {
  const runtimeDir = path.join(getHominemHomeDir(), 'agent')
  return {
    runtimeDir,
    pidPath: path.join(runtimeDir, 'agent.pid'),
    outLogPath: path.join(runtimeDir, 'agent.out.log'),
    errLogPath: path.join(runtimeDir, 'agent.err.log')
  }
}

async function resolveAgentEntrypoint(cwd: string): Promise<string> {
  const candidates = [
    path.resolve(cwd, 'dist/agent/index.js'),
    path.resolve(cwd, 'tools/cli/dist/agent/index.js'),
    path.resolve(cwd, 'src/services/agent-server/index.ts'),
    path.resolve(cwd, 'tools/cli/src/services/agent-server/index.ts')
  ]

  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      continue
    }
  }

  throw new CliError({
    code: 'AGENT_ENTRYPOINT_MISSING',
    category: 'dependency',
    message: 'Agent entrypoint was not found',
    hint: 'Run `bun run --filter @hominem/cli build:features`'
  })
}

export default createCommand({
  name: 'agent start',
  summary: 'Start local agent server',
  description: 'Starts the local agent in background by default.',
  argNames: [],
  args: z.object({}),
  flags: z.object({
    port: z.coerce.number().int().positive().default(4567),
    foreground: z.boolean().default(false)
  }),
  outputSchema: z.object({
    started: z.boolean(),
    background: z.boolean(),
    pid: z.number().nullable(),
    port: z.number(),
    entrypoint: z.string(),
    logs: z.object({
      out: z.string().nullable(),
      err: z.string().nullable()
    })
  }),
  async run({ flags, context }) {
    const runtimePaths = getRuntimePaths()
    const entrypoint = await resolveAgentEntrypoint(context.cwd)

    if (flags.foreground) {
      const child = spawn('bun', [entrypoint], {
        env: { ...context.env, PORT: String(flags.port) },
        stdio: 'inherit'
      })

      try {
        await new Promise<void>((resolve, reject) => {
          child.once('error', reject)
          child.once('exit', () => resolve())
        })
      } catch (error) {
        throw new CliError({
          code: 'AGENT_START_FAILED',
          category: 'dependency',
          message: error instanceof Error ? error.message : 'Failed to run agent in foreground'
        })
      }

      return {
        started: true,
        background: false,
        pid: child.pid ?? null,
        port: flags.port,
        entrypoint,
        logs: {
          out: null,
          err: null
        }
      }
    }

    try {
      await fs.mkdir(runtimePaths.runtimeDir, { recursive: true })
    } catch (error) {
      throw new CliError({
        code: 'AGENT_RUNTIME_DIR_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to create runtime directory'
      })
    }

    let out: Awaited<ReturnType<typeof fs.open>>
    let err: Awaited<ReturnType<typeof fs.open>>
    try {
      out = await fs.open(runtimePaths.outLogPath, 'a')
      err = await fs.open(runtimePaths.errLogPath, 'a')
    } catch (error) {
      throw new CliError({
        code: 'AGENT_LOG_OPEN_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to open agent log files'
      })
    }

    let child
    try {
      child = spawn('bun', [entrypoint], {
        detached: true,
        env: { ...context.env, PORT: String(flags.port) },
        stdio: ['ignore', out.fd, err.fd]
      })
    } catch (error) {
      await out.close()
      await err.close()
      throw new CliError({
        code: 'AGENT_START_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to spawn agent process'
      })
    }
    child.unref()

    if (!child.pid) {
      throw new CliError({
        code: 'AGENT_START_FAILED',
        category: 'internal',
        message: 'Failed to start background agent process'
      })
    }

    try {
      await fs.writeFile(runtimePaths.pidPath, `${child.pid}\n`, 'utf-8')
    } catch (error) {
      throw new CliError({
        code: 'AGENT_PID_WRITE_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to persist agent pid file'
      })
    }
    await out.close()
    await err.close()

    return {
      started: true,
      background: true,
      pid: child.pid,
      port: flags.port,
      entrypoint,
      logs: {
        out: runtimePaths.outLogPath,
        err: runtimePaths.errLogPath
      }
    }
  }
})
