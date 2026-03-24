import { Args, Command } from '@oclif/core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  source: z.string(),
  dest: z.string(),
  fileCount: z.number(),
});

export default class SkillsExport extends Command {
  static description = 'Copy the local `.github/skills` folder to another location';
  static summary = 'Copy the local `.github/skills` folder to another location';

  static override args = {
    dest: Args.string({
      name: 'dest',
      required: false,
      description: 'Destination directory',
      default: '.',
    }),
  };

  static override flags = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { args } = await this.parse(SkillsExport);

    const source = path.resolve(process.cwd(), '.github/skills');
    const dest = path.resolve(process.cwd(), args.dest);

    try {
      const stat = await fs.stat(source);
      if (!stat.isDirectory()) {
        this.error(`source path is not a directory: ${source}`, {
          exit: 4,
          code: 'SKILLS_NOT_DIRECTORY',
        });
      }
    } catch (err) {
      if (err instanceof Error && 'code' in err) {
        throw err;
      }
      this.error(`failed to read skills directory at ${source}`, {
        exit: 3,
        code: 'SKILLS_SOURCE_MISSING',
      });
    }

    try {
      // ensure parent exists
      await fs.mkdir(dest, { recursive: true });
      // copy recursively; fs.cp is experimental but available in Bun/Node
      await fs.cp(source, dest, { recursive: true, force: true });
      // count files for reporting
      let fileCount = 0;
      async function countFiles(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const abs = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await countFiles(abs);
          } else {
            fileCount += 1;
          }
        }
      }
      await countFiles(dest);

      const output = {
        source,
        dest,
        fileCount,
      };

      validateWithZod(outputSchema, output);
      return output;
    } catch (err) {
      this.error(err instanceof Error ? err.message : 'export failed', {
        exit: 3,
        code: 'SKILLS_EXPORT_FAILED',
      });
    }
  }
}
