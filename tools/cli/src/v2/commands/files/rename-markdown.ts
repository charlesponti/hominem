import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function datePrefix(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function collectMarkdown(root: string, recursive: boolean): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const absolute = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (recursive) {
        const nested = await collectMarkdown(absolute, recursive)
        for (const nestedPath of nested) {
          files.push(nestedPath)
        }
      }
      continue
    }

    if (!entry.name.toLowerCase().endsWith('.md')) {
      continue
    }
    files.push(absolute)
  }

  return files
}

async function ensureUniqueFilename(dir: string, filename: string): Promise<string> {
  let next = filename
  let suffix = 1
  while (true) {
    try {
      await fs.access(path.join(dir, next))
      const parsed = path.parse(filename)
      next = `${parsed.name}_${suffix}${parsed.ext}`
      suffix += 1
    } catch {
      return next
    }
  }
}

function extractTopic(raw: string, fallbackName: string): string {
  const lines = raw.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const fromHeading = trimmed.startsWith('#') ? trimmed.replace(/^#+\s*/, '') : trimmed
    const slug = slugify(fromHeading)
    if (slug) {
      return slug.slice(0, 60)
    }
  }

  const fallback = slugify(path.parse(fallbackName).name)
  return fallback || 'untitled'
}

export default createCommand({
  name: 'files rename-markdown',
  summary: 'Normalize markdown file names',
  description: 'Renames markdown files into a stable date/type/topic format.',
  argNames: ['path'],
  args: z.object({
    path: z.string().default('.')
  }),
  flags: z.object({
    recursive: z.boolean().default(false),
    dryRun: z.boolean().default(false),
    type: z.string().default('note'),
    limit: z.coerce.number().int().positive().nullable().default(null)
  }),
  outputSchema: z.object({
    root: z.string(),
    dryRun: z.boolean(),
    processed: z.number(),
    renamed: z.array(z.object({
      oldPath: z.string(),
      newPath: z.string()
    }))
  }),
  async run({ args, flags, context }) {
    const root = path.resolve(context.cwd, args.path)
    let selected: string[]
    try {
      const rootStat = await fs.stat(root)
      if (!rootStat.isDirectory()) {
        throw new CliError({
          code: 'PATH_NOT_DIRECTORY',
          category: 'validation',
          message: `Path is not a directory: ${root}`
        })
      }
      const markdownFiles = await collectMarkdown(root, flags.recursive)
      selected = flags.limit === null ? markdownFiles : markdownFiles.slice(0, flags.limit)
    } catch (error) {
      if (error instanceof CliError) {
        throw error
      }
      throw new CliError({
        code: 'FILES_RENAME_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to read markdown files'
      })
    }

    const renamed: Array<Record<string, string>> = []
    for (const absolute of selected) {
      let content: string
      try {
        content = await fs.readFile(absolute, 'utf-8')
      } catch (error) {
        throw new CliError({
          code: 'FILES_READ_FAILED',
          category: 'dependency',
          message: error instanceof Error ? error.message : `Failed to read ${absolute}`
        })
      }
      const topic = extractTopic(content, absolute)
      const normalizedType = slugify(flags.type) || 'note'
      const name = `${datePrefix()}-${normalizedType}-${topic}.md`
      const nextName = await ensureUniqueFilename(path.dirname(absolute), name)
      const destination = path.join(path.dirname(absolute), nextName)

      if (absolute === destination) {
        continue
      }

      if (!flags.dryRun) {
        if (!destination.startsWith(root)) {
          throw new CliError({
            code: 'WRITE_BOUNDARY_VIOLATION',
            category: 'validation',
            message: 'Refusing to write outside requested root path'
          })
        }
        try {
          await fs.rename(absolute, destination)
        } catch (error) {
          throw new CliError({
            code: 'FILES_RENAME_FAILED',
            category: 'dependency',
            message: error instanceof Error ? error.message : `Failed to rename ${absolute}`
          })
        }
      }

      renamed.push({
        oldPath: absolute,
        newPath: destination
      })
    }

    return {
      root,
      dryRun: flags.dryRun,
      processed: selected.length,
      renamed
    }
  }
})
