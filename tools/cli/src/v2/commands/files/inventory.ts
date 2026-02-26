import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'

async function collectFiles(root: string, recursive: boolean, extension: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const absolute = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (recursive) {
        const nested = await collectFiles(absolute, recursive, extension)
        for (const item of nested) {
          files.push(item)
        }
      }
      continue
    }

    if (extension !== '*' && !entry.name.toLowerCase().endsWith(extension.toLowerCase())) {
      continue
    }

    files.push(absolute)
  }

  return files
}

export default createCommand({
  name: 'files inventory',
  summary: 'Inventory files in a directory',
  description: 'Scans files under a path with deterministic output.',
  argNames: ['path'],
  args: z.object({
    path: z.string().default('.')
  }),
  flags: z.object({
    recursive: z.boolean().default(false),
    extension: z.string().default('*')
  }),
  outputSchema: z.object({
    root: z.string(),
    recursive: z.boolean(),
    extension: z.string(),
    fileCount: z.number(),
    files: z.array(z.string())
  }),
  async run({ args, flags, context }) {
    const root = path.resolve(context.cwd, args.path)
    let files: string[]
    try {
      const rootStat = await fs.stat(root)
      if (!rootStat.isDirectory()) {
        throw new CliError({
          code: 'PATH_NOT_DIRECTORY',
          category: 'validation',
          message: `Path is not a directory: ${root}`
        })
      }
      files = await collectFiles(root, flags.recursive, flags.extension)
    } catch (error) {
      if (error instanceof CliError) {
        throw error
      }
      throw new CliError({
        code: 'FILES_INVENTORY_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to inventory files'
      })
    }

    return {
      root,
      recursive: flags.recursive,
      extension: flags.extension,
      fileCount: files.length,
      files: files.sort((a, b) => a.localeCompare(b))
    }
  }
})
