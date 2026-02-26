import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'
import { requestJson } from '../../http'
import { parseJsonPayload } from '../../http'
import type { JsonValue } from '../../contracts'

function normalizeModels(jsonText: string): string[] {
  const parsed = parseJsonPayload(jsonText, '/api/ai/models')
  if (Array.isArray(parsed)) {
    const models: string[] = []
    for (const item of parsed) {
      if (typeof item === 'string') {
        models.push(item)
      } else if (item !== null && typeof item === 'object' && 'id' in item) {
        const id = (item as Record<string, JsonValue>).id
        if (typeof id === 'string') {
          models.push(id)
        }
      }
    }
    if (models.length > 0) {
      return models
    }
  }
  if (typeof parsed === 'object' && parsed !== null && 'models' in parsed) {
    const value = (parsed as Record<string, JsonValue>).models
    if (Array.isArray(value)) {
      const models: string[] = []
      for (const item of value) {
        if (typeof item === 'string') {
          models.push(item)
        } else if (item !== null && typeof item === 'object' && 'id' in item) {
          const id = (item as Record<string, JsonValue>).id
          if (typeof id === 'string') {
            models.push(id)
          }
        }
      }
      if (models.length > 0) {
        return models
      }
    }
  }
  throw new CliError({
    code: 'DEPENDENCY_RESPONSE_INVALID',
    category: 'dependency',
    message: 'Model inventory response did not include a model list'
  })
}

export default createCommand({
  name: 'ai models',
  summary: 'List available AI models',
  description: 'Returns provider model inventory from API.',
  argNames: [],
  args: z.object({}),
  flags: z.object({
    baseUrl: z.string().default('http://localhost:4040')
  }),
  outputSchema: z.object({
    baseUrl: z.string(),
    modelCount: z.number(),
    models: z.array(z.string())
  }),
  async run({ flags, context }) {
    const raw = await requestJson({
      baseUrl: flags.baseUrl,
      path: '/api/ai/models',
      abortSignal: context.abortSignal
    })
    const models = normalizeModels(raw)

    return {
      baseUrl: flags.baseUrl,
      modelCount: models.length,
      models
    }
  }
})
