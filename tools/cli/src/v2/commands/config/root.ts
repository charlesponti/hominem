import { z } from 'zod';

import { createCommand } from '../../command-factory';

export default createCommand({
  name: 'config',
  summary: 'Configuration domain',
  description: 'Config commands: init, get, set.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    domain: z.literal('config'),
    subcommands: z.array(z.string()),
  }),
  async run() {
    return {
      domain: 'config',
      subcommands: ['init', 'get', 'set'],
    };
  },
});
