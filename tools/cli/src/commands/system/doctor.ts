import { Command } from '@oclif/core';
import fs from 'node:fs/promises';
import { z } from 'zod';

import { getConfigPath, loadConfigV2 } from '@/config';
import { getStoredTokens, hasValidStoredSession } from '@/utils/auth';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  checks: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['pass', 'warn', 'fail']),
      message: z.string(),
    }),
  ),
});

export default class SystemDoctor extends Command {
  static description = 'Run CLI diagnostics';
  static summary = 'Run CLI diagnostics';

  static override flags = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const checks: Array<{ id: string; status: 'pass' | 'warn' | 'fail'; message: string }> = [];
    const configPath = getConfigPath();

    checks.push({
      id: 'runtime.node',
      status: 'pass',
      message: `node ${process.version}`,
    });

    try {
      await fs.access(configPath);
      const config = await loadConfigV2();
      checks.push({
        id: 'config.v2',
        status: config.version === 2 ? 'pass' : 'fail',
        message: `config version ${config.version}`,
      });
    } catch {
      checks.push({
        id: 'config.v2',
        status: 'warn',
        message: `config missing at ${configPath}; run 'hominem config init'`,
      });
    }

    let tokens: Awaited<ReturnType<typeof getStoredTokens>>;
    try {
      tokens = await getStoredTokens();
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Failed to read auth state', {
        exit: 3,
        code: 'AUTH_STATUS_FAILED',
      });
    }

    checks.push({
      id: 'auth.token',
      status: tokens?.accessToken ? 'pass' : 'warn',
      message: tokens?.accessToken
        ? 'auth device-session token stored'
        : "auth token missing; run 'hominem auth login'",
    });

    if (tokens?.issuerBaseUrl) {
      const authenticated = await hasValidStoredSession(tokens.issuerBaseUrl);
      checks.push({
        id: 'auth.session',
        status: authenticated ? 'pass' : 'warn',
        message: authenticated
          ? 'auth session validated remotely'
          : "stored auth token is not accepted; run 'hominem auth login'",
      });
    }

    const output = {
      checks,
    };

    validateWithZod(outputSchema, output);
    return output;
  }
}
