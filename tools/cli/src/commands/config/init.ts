import { Command } from '@oclif/core';
import { z } from 'zod';

import { defaultConfigV2, getConfigPath, saveConfigV2 } from '@/config';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  path: z.string(),
  version: z.literal(2),
});

export default class ConfigInit extends Command {
  static description = 'Writes default config v2 payload to canonical config path.';
  static summary = 'Initialize config v2';

  static override flags = {};
  static override args = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    try {
      await saveConfigV2(defaultConfigV2);
    } catch (error) {
      this.error(
        `Failed to initialize config: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          exit: 3,
          code: 'CONFIG_WRITE_FAILED',
        },
      );
    }

    const output = {
      path: getConfigPath(),
      version: 2 as const,
    };

    return validateWithZod(outputSchema, output);
  }
}
