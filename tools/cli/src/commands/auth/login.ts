import { Command, Flags } from '@oclif/core';
import { z } from 'zod';

import { AuthError, interactiveLogin } from '@/utils/auth';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  authenticated: z.literal(true),
  mode: z.enum(['browser', 'device']),
  baseUrl: z.string(),
});

export default class AuthLogin extends Command {
  static description =
    'Starts the CLI device-code authentication flow and stores machine-client tokens.';
  static summary = 'Authenticate the CLI';

  static override flags = {
    baseUrl: Flags.string({
      description: 'Authentication base URL',
      default: 'http://localhost:4040',
    }),
    scope: Flags.string({
      description: 'Comma-separated list of auth scopes',
      default: '',
    }),
    device: Flags.boolean({
      description: 'Use device code flow instead of browser',
      default: false,
    }),
    timeoutMs: Flags.integer({
      description: 'Timeout in milliseconds',
      default: 120000,
    }),
  };

  static override args = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { flags } = await this.parse(AuthLogin);

    const scopes = flags.scope
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);

    try {
      await interactiveLogin({
        authBaseUrl: flags.baseUrl,
        scopes,
        headless: flags.device,
        outputMode: this.jsonEnabled() ? 'machine' : 'interactive',
        timeoutMs: flags.timeoutMs,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        this.error(`Authentication failed: ${error.message}`, {
          exit: 2,
          code: error.code,
        });
      }
      this.error(
        `Authentication flow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          exit: 2,
        },
      );
    }

    const output = {
      authenticated: true,
      mode: flags.device ? 'device' : 'browser',
      baseUrl: flags.baseUrl,
    };

    return validateWithZod(outputSchema, output);
  }
}
