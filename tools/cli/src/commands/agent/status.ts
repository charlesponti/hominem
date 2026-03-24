import { Command } from '@oclif/core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { getHominemHomeDir } from '@/utils/paths';

import { validateWithZod } from '../../utils/zod-validation';

function getRuntimePaths() {
  const runtimeDir = path.join(getHominemHomeDir(), 'agent');
  return {
    pidPath: path.join(runtimeDir, 'agent.pid'),
    outLogPath: path.join(runtimeDir, 'agent.out.log'),
    errLogPath: path.join(runtimeDir, 'agent.err.log'),
  };
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const outputSchema = z.object({
  running: z.boolean(),
  pid: z.number().nullable(),
  pidPath: z.string(),
  logs: z.object({
    out: z.string(),
    err: z.string(),
  }),
});

type AgentStatusOutput = z.infer<typeof outputSchema>;

export default class AgentStatus extends Command {
  static override description = 'Reports local background agent process health.';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  static override enableJsonFlag = true;

  async run(): Promise<AgentStatusOutput> {
    try {
      const runtimePaths = getRuntimePaths();
      try {
        const raw = await fs.readFile(runtimePaths.pidPath, 'utf-8');
        const pid = Number.parseInt(raw.trim(), 10);
        if (Number.isFinite(pid) && pid > 0 && isProcessAlive(pid)) {
          const output: AgentStatusOutput = {
            running: true,
            pid,
            pidPath: runtimePaths.pidPath,
            logs: {
              out: runtimePaths.outLogPath,
              err: runtimePaths.errLogPath,
            },
          };
          validateWithZod(outputSchema, output);
          return output;
        }
      } catch {
        // report stopped
      }

      const output: AgentStatusOutput = {
        running: false,
        pid: null,
        pidPath: runtimePaths.pidPath,
        logs: {
          out: runtimePaths.outLogPath,
          err: runtimePaths.errLogPath,
        },
      };
      validateWithZod(outputSchema, output);
      return output;
    } catch (error) {
      if (error instanceof Error && !('exit' in error)) {
        this.error(`Failed to get agent status: ${error.message}`, {
          exit: 5,
          code: 'INTERNAL_ERROR',
        });
      }
      throw error;
    }
  }
}
