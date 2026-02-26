import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { requestJson } from '../../http'

export default createCommand({
  name: 'ai ping',
  summary: 'Check AI API availability',
  description: 'Performs a non-authenticated health probe against the AI API host.',
  argNames: [],
  args: z.object({}),
  flags: z.object({
    baseUrl: z.string().default('http://localhost:4040')
  }),
  outputSchema: z.object({
    baseUrl: z.string(),
    reachable: z.literal(true),
    response: z.string()
  }),
  async run({ flags, context }) {
    const response = await requestJson({
      baseUrl: flags.baseUrl,
      path: '/health',
      requireAuth: false,
      abortSignal: context.abortSignal
    })

    return {
      baseUrl: flags.baseUrl,
      reachable: true,
      response
    }
  }
})
