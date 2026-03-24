import { Args, Command } from '@oclif/core';
import { z } from 'zod';

import type { JsonValue } from '@/contracts';

import { getPathValue, loadConfigV2 } from '@/config';
import { JsonValueSchema } from '@/json-value-schema';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  value: JsonValueSchema,
});

export default class ConfigGet extends Command {
  static description = 'Reads full config document or a dot-path selector.';
  static summary = 'Get config values';

  static override args = {
    path: Args.string({
      name: 'path',
      required: false,
      description: 'Dot-path selector (optional, returns full config if omitted)',
    }),
  };

  static override flags = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { args } = await this.parse(ConfigGet);

    let config: Awaited<ReturnType<typeof loadConfigV2>>;
    try {
      config = await loadConfigV2();
    } catch (error) {
      this.error(
        `Failed to load config: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          exit: 3,
          code: 'CONFIG_READ_FAILED',
        },
      );
    }

    if (!args.path) {
      const output = { value: config as JsonValue };
      return validateWithZod(outputSchema, output);
    }

    const value = getPathValue(config as Record<string, JsonValue>, args.path);
    const output = { value: value ?? null };
    return validateWithZod(outputSchema, output);
  }
}
