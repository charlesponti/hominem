import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'

export default createCommand({
  name: 'files head',
  summary: 'Preview top lines from a file',
  description: 'Reads a text file and returns the first N lines deterministically.',
  argNames: ['path'],
  args: z.object({
    path: z.string()
  }),
  flags: z.object({
    lines: z.coerce.number().int().positive().max(200).default(20)
  }),
  outputSchema: z.object({
    path: z.string(),
    linesRequested: z.number(),
    lineCount: z.number(),
    preview: z.array(z.string())
  }),
  async run({ args, flags, context }) {
    const absolutePath = path.resolve(context.cwd, args.path)

    let content: string
    try {
      const stat = await fs.stat(absolutePath)
      if (!stat.isFile()) {
        throw new CliError({
          code: 'PATH_NOT_FILE',
          category: 'validation',
          message: `Path is not a file: ${absolutePath}`
        })
      }
      content = await fs.readFile(absolutePath, 'utf-8')
    } catch (error) {
      if (error instanceof CliError) {
        throw error
      }
      throw new CliError({
        code: 'FILE_READ_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to read file'
      })
    }

    const preview = content.split('\n').slice(0, flags.lines)
    return {
      path: absolutePath,
      linesRequested: flags.lines,
      lineCount: preview.length,
      preview
    }
  }
})
