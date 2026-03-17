import fs from 'node:fs/promises';
import path from 'node:path';
import { Args, Command, Flags } from '@oclif/core';
import { z } from 'zod';

import { validateWithZod } from '../../utils/zod-validation';

function toKebabCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .toLowerCase();
}

function resolveCliRoot(cwd: string): string {
  const normalized = cwd.replace(/\\/g, '/');
  if (normalized.endsWith('/tools/cli')) {
    return cwd;
  }
  return path.join(cwd, 'tools', 'cli');
}

const outputSchema = z.object({
  generated: z.boolean(),
  file: z.string(),
});

type GenerateCommandOutput = z.infer<typeof outputSchema>;

export default class SystemGenerateCommand extends Command {
  static override description = 'Creates a typed command module under src/commands/<domain>/<command>.ts.';

  static override examples = [
    '<%= config.bin %> <%= command.id %> auth login',
    '<%= config.bin %> <%= command.id %> --force my-domain my-command',
  ];

  static override args = {
    domain: Args.string({ description: 'Command domain', required: true }),
    name: Args.string({ description: 'Command name', required: true }),
  };

  static override flags = {
    force: Flags.boolean({
      description: 'Overwrite existing command',
      default: false,
    }),
  };

  static override enableJsonFlag = true;

  async run(): Promise<GenerateCommandOutput> {
    const { args, flags } = await this.parse(SystemGenerateCommand);

    try {
      const domain = toKebabCase(args.domain);
      const name = toKebabCase(args.name);
      const cliRoot = resolveCliRoot(process.cwd());
      const dir = path.join(cliRoot, 'src', 'v2', 'commands', domain);
      const file = path.join(dir, `${name}.ts`);

      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        this.error(
          error instanceof Error ? error.message : 'Failed to prepare command directory',
          { exit: 3, code: 'SCAFFOLD_MKDIR_FAILED' },
        );
      }

      try {
        await fs.access(file);
        if (!flags.force) {
          const output = { generated: false, file };
          validateWithZod(outputSchema, output);
          return output;
        }
      } catch {
        // file missing, continue
      }

      const commandId = `${domain} ${name}`;
      const template = `import { z } from 'zod'\n\nimport { createCommand } from '../../command-factory'\n\nexport default createCommand({\n  name: '${commandId}',\n  summary: 'TODO summary',\n  description: 'TODO description',\n  argNames: [],\n  args: z.object({}),\n  flags: z.object({}),\n  outputSchema: z.object({\n    ok: z.literal(true)\n  }),\n  async run() {\n    return { ok: true }\n  }\n})\n`;

      try {
        await fs.writeFile(file, template, 'utf-8');
      } catch (error) {
        this.error(
          error instanceof Error ? error.message : 'Failed to write command template',
          { exit: 3, code: 'SCAFFOLD_WRITE_FAILED' },
        );
      }

      const output: GenerateCommandOutput = {
        generated: true,
        file,
      };
      validateWithZod(outputSchema, output);
      return output;
    } catch (error) {
      if (error instanceof Error && !('exit' in error)) {
        this.error(`Failed to generate command: ${error.message}`, {
          exit: 5,
          code: 'INTERNAL_ERROR',
        });
      }
      throw error;
    }
  }
}
