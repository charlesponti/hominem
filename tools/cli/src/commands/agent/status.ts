import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { getHominemHomeDir } from '@/utils/paths';

import { createCommand } from '../../command-factory';

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

export default createCommand({
  name: 'agent status',
  summary: 'Show local agent status',
  description: 'Reports local background agent process health.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    running: z.boolean(),
    pid: z.number().nullable(),
    pidPath: z.string(),
    logs: z.object({
      out: z.string(),
      err: z.string(),
    }),
  }),
  async run() {
    const runtimePaths = getRuntimePaths();
    try {
      const raw = await fs.readFile(runtimePaths.pidPath, 'utf-8');
      const pid = Number.parseInt(raw.trim(), 10);
      if (Number.isFinite(pid) && pid > 0 && isProcessAlive(pid)) {
        return {
          running: true,
          pid,
          pidPath: runtimePaths.pidPath,
          logs: {
            out: runtimePaths.outLogPath,
            err: runtimePaths.errLogPath,
          },
        };
      }
    } catch {
      // report stopped
    }

    return {
      running: false,
      pid: null,
      pidPath: runtimePaths.pidPath,
      logs: {
        out: runtimePaths.outLogPath,
        err: runtimePaths.errLogPath,
      },
    };
  },
});
