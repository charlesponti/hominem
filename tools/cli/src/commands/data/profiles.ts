import { z } from 'zod';

import { createCommand } from '../../command-factory';
import { loadConfigV2 } from '../../config';
import { CliError } from '../../errors';

export default createCommand({
  name: 'data profiles',
  summary: 'List configured data profiles',
  description: 'Reads profile definitions from config v2.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    profileCount: z.number(),
    profiles: z.array(
      z.object({
        name: z.string(),
        apiUrl: z.string(),
      }),
    ),
  }),
  async run() {
    let config: Awaited<ReturnType<typeof loadConfigV2>>;
    try {
      config = await loadConfigV2();
    } catch (error) {
      throw new CliError({
        code: 'CONFIG_READ_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to load config',
      });
    }

    return {
      profileCount: config.profiles.length,
      profiles: config.profiles,
    };
  },
});
