import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'

export default createCommand({
  name: 'agent health',
  summary: 'Probe local agent health endpoint',
  description: 'Checks whether the local agent HTTP server is healthy.',
  argNames: [],
  args: z.object({}),
  flags: z.object({
    port: z.coerce.number().int().positive().default(4567),
    host: z.string().default('127.0.0.1'),
    timeoutMs: z.coerce.number().int().positive().max(30000).default(1500)
  }),
  outputSchema: z.object({
    host: z.string(),
    port: z.number(),
    healthy: z.boolean(),
    body: z.string().nullable()
  }),
  async run({ flags, context }) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), flags.timeoutMs)
    context.abortSignal.addEventListener('abort', () => controller.abort(), { once: true })

    try {
      const response = await fetch(`http://${flags.host}:${flags.port}/health`, {
        signal: controller.signal
      })
      if (!response.ok) {
        throw new CliError({
          code: 'AGENT_HEALTH_FAILED',
          category: 'dependency',
          message: `Agent health endpoint returned ${response.status}`
        })
      }
      const body = await response.text()
      return {
        host: flags.host,
        port: flags.port,
        healthy: true,
        body
      }
    } catch (error) {
      if (error instanceof CliError) {
        throw error
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CliError({
          code: 'AGENT_HEALTH_TIMEOUT',
          category: 'dependency',
          message: 'Agent health probe timed out'
        })
      }
      throw new CliError({
        code: 'AGENT_HEALTH_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Agent health probe failed'
      })
    } finally {
      clearTimeout(timeout)
    }
  }
})
