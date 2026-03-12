import { z } from 'zod';

import { createCommand } from '../../command-factory';

export default createCommand({
  name: 'skills',
  summary: 'Skill management domain',
  description: 'Commands for exporting/importing the `.github/skills` directory.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    domain: z.literal('skills'),
    subcommands: z.array(z.string()),
  }),
  async run() {
    return {
      domain: 'skills',
      subcommands: ['export', 'import'],
    };
  },
});
