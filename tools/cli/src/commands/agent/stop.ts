import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { getHominemHomeDir } from '@/utils/paths';

import { createCommand } from '../../command-factory';
import { CliError } from '../../errors';

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

export default createCommand({
  name: 'agent stop',
  summary: 'Stop local agent server',
  description: 'Stops background agent by PID.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    stopped: z.boolean(),
    pid: z.number().nullable(),
  }),
  async run() {
    const pidPath = getPidPath();
    let pid: number;
    try {
      const raw = await fs.readFile(pidPath, 'utf-8');
      pid = Number.parseInt(raw.trim(), 10);
    } catch {
      throw new CliError({
        code: 'AGENT_NOT_RUNNING',
        category: 'dependency',
        message: 'No agent PID file found',
      });
    }

    if (!Number.isFinite(pid) || pid <= 0) {
      throw new CliError({
        code: 'AGENT_PID_INVALID',
        category: 'internal',
        message: 'Agent PID file is invalid',
      });
    }

    if (!isProcessAlive(pid)) {
      try {
        await fs.rm(pidPath, { force: true });
      } catch (error) {
        throw new CliError({
          code: 'AGENT_PID_REMOVE_FAILED',
          category: 'dependency',
          message: error instanceof Error ? error.message : 'Failed to remove stale pid file',
        });
      }
      return { stopped: false, pid };
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      throw new CliError({
        code: 'AGENT_STOP_SIGNAL_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to stop agent process',
      });
    }
    try {
      await fs.rm(pidPath, { force: true });
    } catch (error) {
      throw new CliError({
        code: 'AGENT_PID_REMOVE_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to remove pid file',
      });
    }
    return { stopped: true, pid };
  },
});
