import { Command } from '@oclif/core';
import { z } from 'zod';

import { loadConfigV2 } from '@/config';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  profileCount: z.number(),
  profiles: z.array(
    z.object({
      name: z.string(),
      apiUrl: z.string(),
    }),
  ),
});

export default class DataProfiles extends Command {
  static description = 'List configured data profiles';
  static summary = 'List configured data profiles';

  static override flags = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    let config: Awaited<ReturnType<typeof loadConfigV2>>;
    try {
      config = await loadConfigV2();
    } catch (error) {
      this.error(
        error instanceof Error ? error.message : 'Failed to load config',
        {
          exit: 3,
          code: 'CONFIG_READ_FAILED',
        }
      );
    }

    const output = {
      profileCount: config.profiles.length,
      profiles: config.profiles,
    };

    validateWithZod(outputSchema, output);
    return output;
  }
}
