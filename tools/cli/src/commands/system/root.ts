import { z } from 'zod';

import { createCommand } from '../../command-factory';

export default createCommand({
  name: 'system',
  summary: 'System domain',
  description: 'System commands: doctor, generate command, plugin call.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    domain: z.literal('system'),
    subcommands: z.array(z.string()),
  }),
  async run() {
    return {
      domain: 'system',
      subcommands: ['doctor', 'generate command', 'plugin call'],
    };
  },
});
