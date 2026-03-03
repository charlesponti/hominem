import { z } from 'zod';

import { AuthError, logout } from '@/utils/auth';

import { createCommand } from '../../command-factory';
import { CliError } from '../../errors';

export default createCommand({
  name: 'auth logout',
  summary: 'Logout and clear tokens',
  description: 'Deletes locally stored auth credentials.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    loggedOut: z.literal(true),
  }),
  async run({ context }) {
    try {
      await logout({
        outputMode: context.outputFormat === 'text' ? 'interactive' : 'machine',
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw new CliError({
          code: error.code,
          category: error.category,
          message: error.message,
          hint: error.hint,
        });
      }
      throw error;
    }
    return {
      loggedOut: true,
    };
  },
});
