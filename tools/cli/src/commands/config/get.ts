import { Args } from '@oclif/core';
import { z } from 'zod';

import type { JsonValue } from '@/contracts';

import { getPathValue, loadConfigV2 } from '@/config';
import { JsonValueSchema } from '@/json-value-schema';
import { JsonCommand } from '@/utils/json-command';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  value: JsonValueSchema,
});

export default class ConfigGet extends JsonCommand {
  static description = 'Reads full config document or a dot-path selector.';
  static summary = 'Get config values';

  static override args = {
    path: Args.string({
      name: 'path',
      required: false,
      description: 'Dot-path selector (optional, returns full config if omitted)',
    }),
  };

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { args } = await this.parse(ConfigGet);

    const config = await loadConfigV2();

    if (!args.path) {
      const output = { value: config as JsonValue };
      return validateWithZod(outputSchema, output);
    }

    const value = getPathValue(config as Record<string, JsonValue>, args.path);
    const output = { value: value ?? null };
    return validateWithZod(outputSchema, output);
  }
}
