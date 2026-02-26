import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'
import { AuthError, interactiveLogin } from '@/utils/auth'

const flagsSchema = z.object({
  baseUrl: z.string().default('http://localhost:3000'),
  scope: z.string().default(''),
  device: z.boolean().default(false),
  timeoutMs: z.coerce.number().int().positive().default(120000)
})

export default createCommand({
  name: 'auth login',
  summary: 'Authenticate the CLI',
  description: 'Starts browser or device-code authentication flow and stores tokens.',
  argNames: [],
  args: z.object({}),
  flags: flagsSchema,
  outputSchema: z.object({
    authenticated: z.literal(true),
    mode: z.enum(['browser', 'device']),
    baseUrl: z.string()
  }),
  async run({ flags, context }) {
    const scopes = flags.scope
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean)

    try {
      await interactiveLogin({
        authBaseUrl: flags.baseUrl,
        scopes,
        headless: flags.device,
        outputMode: context.outputFormat === 'text' ? 'interactive' : 'machine',
        timeoutMs: flags.timeoutMs
      })
    } catch (error) {
      if (error instanceof AuthError) {
        throw new CliError({
          code: error.code,
          category: error.category,
          message: error.message,
          hint: error.hint
        })
      }
      throw new CliError({
        code: 'AUTH_LOGIN_FAILED',
        category: 'auth',
        message: error instanceof Error ? error.message : 'Authentication flow failed'
      })
    }

    return {
      authenticated: true,
      mode: flags.device ? 'device' : 'browser',
      baseUrl: flags.baseUrl
    }
  }
})
