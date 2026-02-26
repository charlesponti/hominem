import fs from 'node:fs/promises'

import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { getConfigPath, loadConfigV2 } from '../../config'
import { CliError } from '../../errors'
import { getStoredTokens } from '@/utils/auth'

export default createCommand({
  name: 'system doctor',
  summary: 'Run CLI diagnostics',
  description: 'Evaluates runtime prerequisites and emits deterministic diagnostics.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    checks: z.array(z.object({
      id: z.string(),
      status: z.enum(['pass', 'warn', 'fail']),
      message: z.string()
    }))
  }),
  async run() {
    const checks: Array<{ id: string; status: 'pass' | 'warn' | 'fail'; message: string }> = []
    const configPath = getConfigPath()

    checks.push({
      id: 'runtime.node',
      status: 'pass',
      message: `node ${process.version}`
    })

    try {
      await fs.access(configPath)
      const config = await loadConfigV2()
      checks.push({
        id: 'config.v2',
        status: config.version === 2 ? 'pass' : 'fail',
        message: `config version ${config.version}`
      })
    } catch {
      checks.push({
        id: 'config.v2',
        status: 'warn',
        message: `config missing at ${configPath}; run 'hominem config init'`
      })
    }

    let tokens: Awaited<ReturnType<typeof getStoredTokens>>
    try {
      tokens = await getStoredTokens()
    } catch (error) {
      throw new CliError({
        code: 'AUTH_STATUS_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to read auth state'
      })
    }
    checks.push({
      id: 'auth.token',
      status: tokens?.accessToken ? 'pass' : 'warn',
      message: tokens?.accessToken ? 'auth token available' : "auth token missing; run 'hominem auth login'"
    })

    return {
      checks
    }
  }
})
