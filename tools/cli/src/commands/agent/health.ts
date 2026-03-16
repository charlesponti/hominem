import { Command, Flags } from '@oclif/core';
import { z } from 'zod';

import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  host: z.string(),
  port: z.number(),
  healthy: z.boolean(),
  body: z.string().nullable(),
});

export default class AgentHealth extends Command {
  static description = 'Checks whether the local agent HTTP server is healthy.';
  static summary = 'Probe local agent health endpoint';

  static override flags = {
    port: Flags.integer({
      description: 'Agent server port',
      default: 4567,
    }),
    host: Flags.string({
      description: 'Agent server host',
      default: '127.0.0.1',
    }),
    timeoutMs: Flags.integer({
      description: 'Request timeout in milliseconds',
      default: 1500,
      max: 30000,
    }),
  };

  static override args = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { flags } = await this.parse(AgentHealth);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), flags.timeoutMs);

    try {
      const response = await fetch(`http://${flags.host}:${flags.port}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        this.error(`Agent health endpoint returned ${response.status}`, {
          exit: 3,
          code: 'AGENT_HEALTH_FAILED',
        });
      }
      const body = await response.text();
      const output = {
        host: flags.host,
        port: flags.port,
        healthy: true,
        body,
      };
      return validateWithZod(outputSchema, output);
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        this.error('Agent health probe timed out', {
          exit: 3,
          code: 'AGENT_HEALTH_TIMEOUT',
        });
      }
      this.error(
        `Agent health probe failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          exit: 3,
          code: 'AGENT_HEALTH_FAILED',
        }
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
