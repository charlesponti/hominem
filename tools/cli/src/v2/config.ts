import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { JsonValue } from './contracts'
import { getHominemHomeDir } from '@/utils/paths'

export function getConfigPath(): string {
  return path.join(getHominemHomeDir(), 'config.json')
}

export const configV2Schema = z.object({
  version: z.literal(2),
  auth: z.object({
    provider: z.string().default('better-auth')
  }).default({ provider: 'better-auth' }),
  profiles: z.array(z.object({
    name: z.string(),
    apiUrl: z.string().url()
  })).default([]),
  ai: z.object({
    providers: z.record(z.string(), z.object({
      enabled: z.boolean().default(true),
      model: z.string().optional()
    })).default({}),
    defaults: z.object({
      provider: z.string().default('openai'),
      model: z.string().optional()
    }).default({ provider: 'openai' })
  }).default({ providers: {}, defaults: { provider: 'openai' } }),
  telemetry: z.object({
    enabled: z.boolean().default(false)
  }).default({ enabled: false }),
  output: z.object({
    format: z.enum(['text', 'json', 'ndjson']).default('text')
  }).default({ format: 'text' })
})

export type ConfigV2 = z.infer<typeof configV2Schema>

export const defaultConfigV2: ConfigV2 = configV2Schema.parse({ version: 2 })

export async function loadConfigV2(): Promise<ConfigV2> {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf-8')
    return configV2Schema.parse(JSON.parse(raw))
  } catch {
    return defaultConfigV2
  }
}

export async function saveConfigV2(config: ConfigV2): Promise<void> {
  const parsed = configV2Schema.parse(config)
  const hominemDir = getHominemHomeDir()
  const configPath = getConfigPath()
  await fs.mkdir(hominemDir, { recursive: true })
  await fs.writeFile(configPath, JSON.stringify(parsed, null, 2), 'utf-8')
}

export function parsePathSelector(selector: string): string[] {
  return selector.split('.').map((segment) => segment.trim()).filter(Boolean)
}

export function getPathValue(source: Record<string, JsonValue>, selector: string): JsonValue | undefined {
  const segments = parsePathSelector(selector)
  let current: JsonValue = source
  for (const segment of segments) {
    if (current === null || typeof current !== 'object' || Array.isArray(current) || !(segment in current)) {
      return undefined
    }
    current = current[segment] as JsonValue
  }
  return current
}

export function setPathValue(source: Record<string, JsonValue>, selector: string, value: JsonValue): Record<string, JsonValue> {
  const segments = parsePathSelector(selector)
  const clone = structuredClone(source) as Record<string, JsonValue>

  let current: Record<string, JsonValue> = clone
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const isLeaf = index === segments.length - 1
    if (isLeaf) {
      current[segment] = value
      continue
    }

    const next = current[segment]
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      current[segment] = {}
    }
    current = current[segment] as Record<string, JsonValue>
  }

  return clone
}
