import fs from 'node:fs/promises'
import path from 'node:path'

import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'

function toKebabCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .toLowerCase()
}

function resolveCliRoot(cwd: string): string {
  const normalized = cwd.replace(/\\/g, '/')
  if (normalized.endsWith('/tools/cli')) {
    return cwd
  }
  return path.join(cwd, 'tools', 'cli')
}

export default createCommand({
  name: 'system generate command',
  summary: 'Generate command scaffolding',
  description: 'Creates a typed command module under src/v2/commands/<domain>/<command>.ts.',
  argNames: ['domain', 'name'],
  args: z.object({
    domain: z.string(),
    name: z.string()
  }),
  flags: z.object({
    force: z.boolean().default(false)
  }),
  outputSchema: z.object({
    generated: z.boolean(),
    file: z.string()
  }),
  async run({ args, flags, context }) {
    const domain = toKebabCase(args.domain)
    const name = toKebabCase(args.name)
    const cliRoot = resolveCliRoot(context.cwd)
    const dir = path.join(cliRoot, 'src', 'v2', 'commands', domain)
    const file = path.join(dir, `${name}.ts`)

    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      throw new CliError({
        code: 'SCAFFOLD_MKDIR_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to prepare command directory'
      })
    }

    try {
      await fs.access(file)
      if (!flags.force) {
        return { generated: false, file }
      }
    } catch {
      // file missing, continue
    }

    const commandId = `${domain} ${name}`
    const template = `import { z } from 'zod'\n\nimport { createCommand } from '../../command-factory'\n\nexport default createCommand({\n  name: '${commandId}',\n  summary: 'TODO summary',\n  description: 'TODO description',\n  argNames: [],\n  args: z.object({}),\n  flags: z.object({}),\n  outputSchema: z.object({\n    ok: z.literal(true)\n  }),\n  async run() {\n    return { ok: true }\n  }\n})\n`

    try {
      await fs.writeFile(file, template, 'utf-8')
    } catch (error) {
      throw new CliError({
        code: 'SCAFFOLD_WRITE_FAILED',
        category: 'dependency',
        message: error instanceof Error ? error.message : 'Failed to write command template'
      })
    }
    return {
      generated: true,
      file
    }
  }
})
