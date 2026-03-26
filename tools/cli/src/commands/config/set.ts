import { Args } from '@oclif/core';
import { z } from 'zod';

import type { JsonValue } from '@/contracts';

import { loadConfigV2, saveConfigV2, setPathValue } from '@/config';
import { JsonValueSchema } from '@/json-value-schema';
import { failCommand } from '@/utils/command-errors';
import { JsonCommand } from '@/utils/json-command';
import { validateWithZod } from '@/utils/zod-validation';

function parseValue(raw: string): JsonValue {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;

  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && raw.trim() !== '') {
    return asNumber;
  }

  try {
    const parsed = JSON.parse(raw) as JsonValue;
    return parsed;
  } catch {
    // ignore
  }

  return raw;
}

const outputSchema = z.object({
  updatedPath: z.string(),
  value: JsonValueSchema,
});

export default class ConfigSet extends JsonCommand {
  static description = 'Writes a scalar or JSON object value at a dot-path selector.';
  static summary = 'Set config values';

  static override args = {
    path: Args.string({
      name: 'path',
      required: true,
      description: 'Dot-path selector',
    }),
    value: Args.string({
      name: 'value',
      required: true,
      description: 'Value to set (parsed as JSON or string)',
    }),
  };

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { args } = await this.parse(ConfigSet);

    const config = await loadConfigV2();

    const value = parseValue(args.value);
    const updated = setPathValue(config as Record<string, JsonValue>, args.path, value);
    try {
      await saveConfigV2(updated as typeof config);
    } catch (error) {
      failCommand(this, 'Failed to persist config', error as Error | string | undefined, {
        exit: 3,
        code: 'CONFIG_WRITE_FAILED',
      });
    }

    const output = {
      updatedPath: args.path,
      value,
    };

    return validateWithZod(outputSchema, output);
  }
}
