import fs from 'node:fs/promises';
import path from 'node:path';
import { Args, Flags, Command } from '@oclif/core';
import { z } from 'zod';

import { validateWithZod } from '@/utils/zod-validation';

async function collectFiles(
  root: string,
  recursive: boolean,
  extension: string,
): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        const nested = await collectFiles(absolute, recursive, extension);
        for (const item of nested) {
          files.push(item);
        }
      }
      continue;
    }

    if (extension !== '*' && !entry.name.toLowerCase().endsWith(extension.toLowerCase())) {
      continue;
    }

    files.push(absolute);
  }

  return files;
}

const outputSchema = z.object({
  root: z.string(),
  recursive: z.boolean(),
  extension: z.string(),
  fileCount: z.number(),
  files: z.array(z.string()),
});

export default class FilesInventory extends Command {
  static description = 'Inventory files in a directory';
  static summary = 'Inventory files in a directory';

  static override args = {
    path: Args.string({
      name: 'path',
      required: false,
      description: 'Directory path to inventory',
      default: '.',
    }),
  };

  static override flags = {
    recursive: Flags.boolean({
      description: 'Search recursively',
      default: false,
    }),
    extension: Flags.string({
      description: 'Filter by extension',
      default: '*',
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { args, flags } = await this.parse(FilesInventory);

    const root = path.resolve(process.cwd(), args.path);
    let files: string[];

    try {
      const rootStat = await fs.stat(root);
      if (!rootStat.isDirectory()) {
        this.error(`Path is not a directory: ${root}`, {
          exit: 4,
          code: 'PATH_NOT_DIRECTORY',
        });
      }
      files = await collectFiles(root, flags.recursive, flags.extension);
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        // Re-throw oclif errors
        throw error;
      }
      this.error(
        error instanceof Error ? error.message : 'Failed to inventory files',
        {
          exit: 3,
          code: 'FILES_INVENTORY_FAILED',
        }
      );
    }

    const output = {
      root,
      recursive: flags.recursive,
      extension: flags.extension,
      fileCount: files.length,
      files: files.sort((a, b) => a.localeCompare(b)),
    };

    validateWithZod(outputSchema, output);
    return output;
  }
}
