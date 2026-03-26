import { z } from 'zod';

import { defaultConfigV2, getConfigPath, saveConfigV2 } from '@/config';
import { failCommand } from '@/utils/command-errors';
import { JsonCommand } from '@/utils/json-command';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  path: z.string(),
  version: z.literal(2),
});

export default class ConfigInit extends JsonCommand {
  static description = 'Writes default config v2 payload to canonical config path.';
  static summary = 'Initialize config v2';

  async run(): Promise<z.infer<typeof outputSchema>> {
    try {
      await saveConfigV2(defaultConfigV2);
    } catch (error) {
      failCommand(this, 'Failed to initialize config', error as Error | string | undefined, {
        exit: 3,
        code: 'CONFIG_WRITE_FAILED',
      });
    }

    const output = {
      path: getConfigPath(),
      version: 2 as const,
    };

    return validateWithZod(outputSchema, output);
  }
}
