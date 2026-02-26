import { z } from 'zod';

import { createCommand } from '../../command-factory';

export default createCommand({
  name: 'files',
  summary: 'Files domain',
  description: 'Files command namespace for inventories and deterministic renaming.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    domain: z.literal('files'),
    subcommands: z.array(z.string()),
  }),
  async run() {
    return {
      domain: 'files',
      subcommands: ['inventory', 'head', 'rename-markdown'],
    };
  },
});
