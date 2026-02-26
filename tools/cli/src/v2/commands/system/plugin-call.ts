import path from 'node:path'
import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'
import { JsonValueSchema } from '../../json-value-schema'
import { invokePluginRpc } from '../../plugin-rpc'
import type { JsonValue } from '../../contracts'

function parseParams(raw: string | undefined): JsonValue | undefined {
  if (!raw) {
    return undefined
  }
  try {
    return JSON.parse(raw) as JsonValue
  } catch {
    throw new CliError({
      code: 'PLUGIN_PARAMS_INVALID',
      category: 'validation',
      message: 'Plugin params must be valid JSON'
    })
  }
}

export default createCommand({
  name: 'system plugin call',
  summary: 'Invoke plugin method via JSON-RPC',
  description: 'Calls a plugin manifest entry through an isolated child process.',
  argNames: ['pluginRoot', 'method'],
  args: z.object({
    pluginRoot: z.string().min(1),
    method: z.string().min(1)
  }),
  flags: z.object({
    params: z.string().optional(),
    timeoutMs: z.coerce.number().int().positive().default(5000),
    runtimeBinary: z.string().optional()
  }),
  outputSchema: z.object({
    pluginRoot: z.string(),
    method: z.string(),
    result: JsonValueSchema
  }),
  async run({ args, flags, context }) {
    const pluginRoot = path.resolve(context.cwd, args.pluginRoot)
    const params = parseParams(flags.params)
    const result = await invokePluginRpc({
      pluginRoot,
      method: args.method,
      params,
      timeoutMs: flags.timeoutMs,
      runtimeBinary: flags.runtimeBinary
    })

    return {
      pluginRoot,
      method: args.method,
      result
    }
  }
})
