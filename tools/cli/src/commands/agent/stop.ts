import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from '@oclif/core';
import { z } from 'zod';

import { getHominemHomeDir } from '@/utils/paths';
import { validateWithZod } from '@/utils/zod-validation';

function getPidPath(): string {
  return path.join(getHominemHomeDir(), 'agent', 'agent.pid');
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
  stopped: z.boolean(),
  pid: z.number().nullable(),
});

export default class AgentStop extends Command {
  static description = 'Stop local agent server';
  static summary = 'Stop local agent server';

  static override flags = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const pidPath = getPidPath();
    let pid: number;

    try {
      const raw = await fs.readFile(pidPath, 'utf-8');
      pid = Number.parseInt(raw.trim(), 10);
    } catch {
      this.error('No agent PID file found', {
        exit: 3,
        code: 'AGENT_NOT_RUNNING',
      });
    }

    if (!Number.isFinite(pid) || pid <= 0) {
      this.error('Agent PID file is invalid', {
        exit: 5,
        code: 'AGENT_PID_INVALID',
      });
    }

    if (!isProcessAlive(pid)) {
      try {
        await fs.rm(pidPath, { force: true });
      } catch (error) {
        this.error(
          error instanceof Error ? error.message : 'Failed to remove stale pid file',
          {
            exit: 3,
            code: 'AGENT_PID_REMOVE_FAILED',
          }
        );
      }
      const output = { stopped: false, pid };
      validateWithZod(outputSchema, output);
      return output;
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      this.error(
        error instanceof Error ? error.message : 'Failed to stop agent process',
        {
          exit: 3,
          code: 'AGENT_STOP_SIGNAL_FAILED',
        }
      );
    }

    try {
      await fs.rm(pidPath, { force: true });
    } catch (error) {
      this.error(
        error instanceof Error ? error.message : 'Failed to remove pid file',
        {
          exit: 3,
          code: 'AGENT_PID_REMOVE_FAILED',
        }
      );
    }

    const output = { stopped: true, pid };
    validateWithZod(outputSchema, output);
    return output;
  }
}
