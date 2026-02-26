import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

export const pluginManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  entry: z.string(),
  permissions: z.array(z.enum(['network', 'filesystem:read', 'filesystem:write'])).default([])
})

export type PluginManifest = z.infer<typeof pluginManifestSchema>

export async function loadPluginManifest(rootPath: string): Promise<PluginManifest> {
  const filePath = path.join(rootPath, 'hominem.plugin.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  return pluginManifestSchema.parse(JSON.parse(raw))
}

export function resolvePluginEntry(rootPath: string, manifest: PluginManifest): string {
  if (path.isAbsolute(manifest.entry)) {
    throw new Error('Plugin entry must be relative to plugin root')
  }

  const resolved = path.resolve(rootPath, manifest.entry)
  const normalizedRoot = `${path.resolve(rootPath)}${path.sep}`
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error('Plugin entry must stay within plugin root')
  }

  return resolved
}
