import { z } from 'zod'

import { createCommand } from '../../command-factory'

export default createCommand({
  name: 'auth',
  summary: 'Authentication domain',
  description: 'Authentication commands: login, status, logout.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    domain: z.literal('auth'),
    subcommands: z.array(z.string())
  }),
  async run() {
    return {
      domain: 'auth',
      subcommands: ['login', 'status', 'logout']
    }
  }
})
