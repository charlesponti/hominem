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

export default class SkillsImport extends Command {
  static description = 'Copy skills from another location into `.github/skills`';
  static summary = 'Copy skills from another location into `.github/skills`';

  static override args = {
    src: Args.string({
      name: 'src',
      required: false,
      description: 'Source directory',
      default: '.',
    }),
  };

  static override flags = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { args } = await this.parse(SkillsImport);

    const source = path.resolve(process.cwd(), args.src);
    const dest = path.resolve(process.cwd(), '.github/skills');

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
        this.error(`source path is not a directory: ${source}`, {
          exit: 4,
          code: 'SKILLS_SOURCE_NOT_DIRECTORY',
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

    this.error('import failed', {
      exit: 3,
      code: 'SKILLS_IMPORT_FAILED',
    });
  }
}
