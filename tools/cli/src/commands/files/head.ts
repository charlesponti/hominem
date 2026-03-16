import fs from 'node:fs/promises';
import path from 'node:path';
import { Args, Command, Flags } from '@oclif/core';
import { z } from 'zod';

import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  path: z.string(),
  linesRequested: z.number(),
  lineCount: z.number(),
  preview: z.array(z.string()),
});

export default class FilesHead extends Command {
  static description = 'Reads a text file and returns the first N lines deterministically.';
  static summary = 'Preview top lines from a file';

  static override args = {
    path: Args.string({
      name: 'path',
      required: true,
      description: 'File path to preview',
    }),
  };

  static override flags = {
    lines: Flags.integer({
      char: 'n',
      description: 'Number of lines to show',
      default: 20,
      max: 200,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { args, flags } = await this.parse(FilesHead);

    const absolutePath = path.resolve(process.cwd(), args.path);

    let content: string;
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) {
        this.error(`Path is not a file: ${absolutePath}`, {
          exit: 2,
          code: 'PATH_NOT_FILE',
        });
      }
      content = await fs.readFile(absolutePath, 'utf-8');
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        this.error(`File not found: ${absolutePath}`, {
          exit: 2,
          code: 'FILE_NOT_FOUND',
        });
      }
      this.error(
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          exit: 3,
          code: 'FILE_READ_FAILED',
        }
      );
    }

    const preview = content.split('\n').slice(0, flags.lines);
    const output = {
      path: absolutePath,
      linesRequested: flags.lines,
      lineCount: preview.length,
      preview,
    };

    return validateWithZod(outputSchema, output);
  }
}

