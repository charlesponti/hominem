import { Args, Command, Flags } from '@oclif/core';
import path from 'node:path';
import { z } from 'zod';

import type { JsonValue } from '../../contracts';

import { JsonValueSchema } from '../../json-value-schema';
import { invokePluginRpc } from '../../plugin-rpc';
import { validateWithZod } from '../../utils/zod-validation';

function parseParams(raw: string | undefined): JsonValue | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as JsonValue;
  } catch {
    throw new Error('Plugin params must be valid JSON');
  }
}

const outputSchema = z.object({
  pluginRoot: z.string(),
  method: z.string(),
  result: JsonValueSchema,
});

type PluginCallOutput = z.infer<typeof outputSchema>;

export default class SystemPluginCall extends Command {
  static override description = 'Calls a plugin manifest entry through an isolated child process.';

  static override examples = [
    '<%= config.bin %> <%= command.id %> /path/to/plugin myMethod',
    '<%= config.bin %> <%= command.id %> /path/to/plugin myMethod --params \'{"key":"value"}\'',
  ];

  static override args = {
    pluginRoot: Args.string({ description: 'Path to plugin root', required: true }),
    method: Args.string({ description: 'Method name to invoke', required: true }),
  };

  static override flags = {
    params: Flags.string({
      description: 'JSON params to pass to method',
      required: false,
    }),
    timeoutMs: Flags.integer({
      description: 'Timeout in milliseconds',
      default: 5000,
    }),
    runtimeBinary: Flags.string({
      description: 'Path to runtime binary',
      required: false,
    }),
  };

  static override enableJsonFlag = true;

  async run(): Promise<PluginCallOutput> {
    const { args, flags } = await this.parse(SystemPluginCall);

    try {
      const pluginRoot = path.resolve(process.cwd(), args.pluginRoot);
      const params = parseParams(flags.params);
      const result = await invokePluginRpc({
        pluginRoot,
        method: args.method,
        params,
        timeoutMs: flags.timeoutMs,
        runtimeBinary: flags.runtimeBinary,
      });

      const output: PluginCallOutput = {
        pluginRoot,
        method: args.method,
        result,
      };
      validateWithZod(outputSchema, output);
      return output;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Plugin params')) {
          this.error(error.message, { exit: 4, code: 'PLUGIN_PARAMS_INVALID' });
        }
        this.error(`Failed to call plugin: ${error.message}`, {
          exit: 5,
          code: 'INTERNAL_ERROR',
        });
      }
      throw error;
    }
  }
}
