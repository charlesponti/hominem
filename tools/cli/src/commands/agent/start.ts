import { Flags, Command } from '@oclif/core';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { getHominemHomeDir } from '@/utils/paths';
import { validateWithZod } from '@/utils/zod-validation';

function getRuntimePaths() {
  const runtimeDir = path.join(getHominemHomeDir(), 'agent');
  return {
    runtimeDir,
    pidPath: path.join(runtimeDir, 'agent.pid'),
    outLogPath: path.join(runtimeDir, 'agent.out.log'),
    errLogPath: path.join(runtimeDir, 'agent.err.log'),
  };
}

async function resolveAgentEntrypoint(cwd: string): Promise<string> {
  const candidates = [
    path.resolve(cwd, 'dist/agent/index.js'),
    path.resolve(cwd, 'tools/cli/dist/agent/index.js'),
    path.resolve(cwd, 'src/services/agent-server/index.ts'),
    path.resolve(cwd, 'tools/cli/src/services/agent-server/index.ts'),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error('Agent entrypoint was not found');
}

const outputSchema = z.object({
  started: z.boolean(),
  background: z.boolean(),
  pid: z.number().nullable(),
  port: z.number(),
  entrypoint: z.string(),
  logs: z.object({
    out: z.string().nullable(),
    err: z.string().nullable(),
  }),
});

export default class AgentStart extends Command {
  static description = 'Start local agent server';
  static summary = 'Start local agent server';

  static override flags = {
    port: Flags.integer({
      description: 'Port to listen on',
      default: 4567,
    }),
    foreground: Flags.boolean({
      description: 'Run in foreground instead of background',
      default: false,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { flags } = await this.parse(AgentStart);

    const runtimePaths = getRuntimePaths();
    let entrypoint: string;

    try {
      entrypoint = await resolveAgentEntrypoint(process.cwd());
    } catch {
      this.error(
        'Agent entrypoint was not found - Run `bun run --filter @hominem/cli build:features`',
        {
          exit: 3,
          code: 'AGENT_ENTRYPOINT_MISSING',
        },
      );
    }

    if (flags.foreground) {
      const child = spawn('bun', [entrypoint], {
        env: { ...process.env, PORT: String(flags.port) },
        stdio: 'inherit',
      });

      try {
        await new Promise<void>((resolve, reject) => {
          child.once('error', reject);
          child.once('exit', () => resolve());
        });
      } catch (error) {
        this.error(error instanceof Error ? error.message : 'Failed to run agent in foreground', {
          exit: 3,
          code: 'AGENT_START_FAILED',
        });
      }

      const output = {
        started: true,
        background: false,
        pid: child.pid ?? null,
        port: flags.port,
        entrypoint,
        logs: {
          out: null,
          err: null,
        },
      };

      validateWithZod(outputSchema, output);
      return output;
    }

    try {
      await fs.mkdir(runtimePaths.runtimeDir, { recursive: true });
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Failed to create runtime directory', {
        exit: 3,
        code: 'AGENT_RUNTIME_DIR_FAILED',
      });
    }

    let out: Awaited<ReturnType<typeof fs.open>>;
    let err: Awaited<ReturnType<typeof fs.open>>;
    try {
      out = await fs.open(runtimePaths.outLogPath, 'a');
      err = await fs.open(runtimePaths.errLogPath, 'a');
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Failed to open agent log files', {
        exit: 3,
        code: 'AGENT_LOG_OPEN_FAILED',
      });
    }

    let child;
    try {
      child = spawn('bun', [entrypoint], {
        detached: true,
        env: { ...process.env, PORT: String(flags.port) },
        stdio: ['ignore', out.fd, err.fd],
      });
    } catch (error) {
      await out.close();
      await err.close();
      this.error(error instanceof Error ? error.message : 'Failed to spawn agent process', {
        exit: 3,
        code: 'AGENT_START_FAILED',
      });
    }
    child.unref();

    if (!child.pid) {
      this.error('Failed to start background agent process', {
        exit: 5,
        code: 'AGENT_START_FAILED',
      });
    }

    try {
      await fs.writeFile(runtimePaths.pidPath, `${child.pid}\n`, 'utf-8');
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Failed to persist agent pid file', {
        exit: 3,
        code: 'AGENT_PID_WRITE_FAILED',
      });
    }
    await out.close();
    await err.close();

    const output = {
      started: true,
      background: true,
      pid: child.pid,
      port: flags.port,
      entrypoint,
      logs: {
        out: runtimePaths.outLogPath,
        err: runtimePaths.errLogPath,
      },
    };

    validateWithZod(outputSchema, output);
    return output;
  }
}
