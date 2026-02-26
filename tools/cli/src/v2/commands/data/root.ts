import { z } from 'zod'

import { createCommand } from '../../command-factory'

export default createCommand({
  name: 'data',
  summary: 'Data domain',
  description: 'Data command namespace for structured API data retrieval.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    domain: z.literal('data'),
    subcommands: z.array(z.string())
  }),
  async run() {
    return {
      domain: 'data',
      subcommands: ['accounts', 'profiles']
    }
  }
})
