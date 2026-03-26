import { z } from 'zod';

import { AuthError, logout } from '@/utils/auth';
import { failCommand } from '@/utils/command-errors';
import { JsonCommand } from '@/utils/json-command';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  loggedOut: z.literal(true),
});

export default class AuthLogout extends JsonCommand {
  static description =
    'Deletes locally stored machine-client credentials without revoking remote sessions.';
  static summary = 'Logout and clear tokens';

  async run(): Promise<z.infer<typeof outputSchema>> {
    try {
      await logout({
        outputMode: this.jsonEnabled() ? 'machine' : 'interactive',
      });
    } catch (error) {
      if (error instanceof AuthError) {
        failCommand(this, 'Logout failed', error.message, {
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
