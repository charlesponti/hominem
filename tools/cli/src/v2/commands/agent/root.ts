import { z } from 'zod'

import { createCommand } from '../../command-factory'

export default createCommand({
  name: 'agent',
  summary: 'Agent domain',
  description: 'Agent command namespace for local process lifecycle management.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    domain: z.literal('agent'),
    subcommands: z.array(z.string())
  }),
  async run() {
    return {
      domain: 'agent',
      subcommands: ['start', 'stop', 'status', 'health']
    }
  }
})
