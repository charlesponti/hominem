import { Command } from '@oclif/core';
import { z } from 'zod';

import { AuthError, logout } from '@/utils/auth';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  loggedOut: z.literal(true),
});

export default class AuthLogout extends Command {
  static description =
    'Deletes locally stored machine-client credentials without revoking remote sessions.';
  static summary = 'Logout and clear tokens';

  static override flags = {};
  static override args = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    try {
      await logout({
        outputMode: this.jsonEnabled() ? 'machine' : 'interactive',
      });
    } catch (error) {
      if (error instanceof AuthError) {
        this.error(`Logout failed: ${error.message}`, {
          exit: 2,
          code: error.code,
        });
      }
      throw error;
    }

    const output = { loggedOut: true };
    return validateWithZod(outputSchema, output);
  }
}
