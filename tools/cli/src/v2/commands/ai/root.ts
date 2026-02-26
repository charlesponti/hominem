import { z } from 'zod'

import { createCommand } from '../../command-factory'

export default createCommand({
  name: 'ai',
  summary: 'AI domain',
  description: 'AI command namespace for model discovery and prompt execution.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    domain: z.literal('ai'),
    subcommands: z.array(z.string())
  }),
  async run() {
    return {
      domain: 'ai',
      subcommands: ['models', 'invoke', 'ping']
    }
  }
})
