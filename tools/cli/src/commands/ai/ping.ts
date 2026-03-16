import { Command, Flags } from '@oclif/core';
import { z } from 'zod';

import { requestJson } from '@/http';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  baseUrl: z.string(),
  reachable: z.literal(true),
  response: z.string(),
});

export default class AiPing extends Command {
  static description = 'Performs a non-authenticated health probe against the AI API host.';
  static summary = 'Check AI API availability';

  static override flags = {
    baseUrl: Flags.string({
      description: 'API base URL',
      default: 'http://localhost:4040',
    }),
  };

  static override args = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { flags } = await this.parse(AiPing);

    const response = await requestJson({
      baseUrl: flags.baseUrl,
      path: '/health',
      requireAuth: false,
      abortSignal: new AbortController().signal,
    });

    const output = {
      baseUrl: flags.baseUrl,
      reachable: true as const,
      response,
    };

    return validateWithZod(outputSchema, output);
  }
}
