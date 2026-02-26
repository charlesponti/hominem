import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { getPathValue, loadConfigV2 } from '../../config'
import type { JsonValue } from '../../contracts'
import { CliError } from '../../errors'
import { JsonValueSchema } from '../../json-value-schema'

export default createCommand({
  name: 'config get',
  summary: 'Get config values',
  description: 'Reads full config document or a dot-path selector.',
  argNames: ['path'],
  args: z.object({
    path: z.string().optional()
  }),
  flags: z.object({}),
  outputSchema: z.object({
    value: JsonValueSchema
  }),
  async run({ args }) {
    let config: Awaited<ReturnType<typeof loadConfigV2>>
    try {
      config = await loadConfigV2()
    } catch (error) {
      throw new CliError({
        code: 'CONFIG_READ_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to load config'
      })
    }
    if (!args.path) {
      return { value: config as JsonValue }
    }

    const value = getPathValue(config as Record<string, JsonValue>, args.path)
    return { value: value ?? null }
  }
})
