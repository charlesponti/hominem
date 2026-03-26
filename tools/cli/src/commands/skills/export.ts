import path from 'node:path';

import { Args, Command } from '@oclif/core';
import { z } from 'zod';

import { assertDirectoryPath, copyDirectoryAndCount } from '@/utils/fs-commands';
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
      await assertDirectoryPath(source);
      const fileCount = await copyDirectoryAndCount(source, dest);

      const output = {
        source,
        dest,
        fileCount,
      };

      validateWithZod(outputSchema, output);
      return output;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Path is not a directory:')) {
        this.error(err.message, {
          exit: 4,
          code: 'SKILLS_NOT_DIRECTORY',
        });
      }
      if (err instanceof Error && 'code' in err) {
        throw err;
      }
      this.error(`failed to read skills directory at ${source}`, {
        exit: 3,
        code: 'SKILLS_SOURCE_MISSING',
      });
    }

    this.error('export failed', {
      exit: 3,
      code: 'SKILLS_EXPORT_FAILED',
    });
  }
}
