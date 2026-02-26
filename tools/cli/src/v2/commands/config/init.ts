import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { defaultConfigV2, getConfigPath, saveConfigV2 } from '../../config'
import { CliError } from '../../errors'

export default createCommand({
  name: 'config init',
  summary: 'Initialize config v2',
  description: 'Writes default config v2 payload to canonical config path.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    path: z.string(),
    version: z.literal(2)
  }),
  async run() {
    try {
      await saveConfigV2(defaultConfigV2)
    } catch (error) {
      throw new CliError({
        code: 'CONFIG_WRITE_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to initialize config'
      })
    }
    return {
      path: getConfigPath(),
      version: 2
    }
  }
})
