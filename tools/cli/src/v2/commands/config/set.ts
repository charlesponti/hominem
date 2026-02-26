import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { loadConfigV2, saveConfigV2, setPathValue } from '../../config'
import type { JsonValue } from '../../contracts'
import { CliError } from '../../errors'
import { JsonValueSchema } from '../../json-value-schema'

function parseValue(raw: string): JsonValue {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null

  const asNumber = Number(raw)
  if (!Number.isNaN(asNumber) && raw.trim() !== '') {
    return asNumber
  }

  try {
    const parsed = JSON.parse(raw) as JsonValue
    return parsed
  } catch {
    // ignore
  }

  return raw
}

export default createCommand({
  name: 'config set',
  summary: 'Set config values',
  description: 'Writes a scalar or JSON object value at a dot-path selector.',
  argNames: ['path', 'value'],
  args: z.object({
    path: z.string(),
    value: z.string()
  }),
  flags: z.object({}),
  outputSchema: z.object({
    updatedPath: z.string(),
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
    const value = parseValue(args.value)
    const updated = setPathValue(config as Record<string, JsonValue>, args.path, value)
    try {
      await saveConfigV2(updated as typeof config)
    } catch (error) {
      throw new CliError({
        code: 'CONFIG_WRITE_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to persist config'
      })
    }

    return {
      updatedPath: args.path,
      value
    }
  }
})
