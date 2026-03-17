import fs from 'node:fs/promises';
import path from 'node:path';
import { Args, Flags, Command } from '@oclif/core';
import { z } from 'zod';

import { validateWithZod } from '@/utils/zod-validation';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function datePrefix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function collectMarkdown(root: string, recursive: boolean): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        const nested = await collectMarkdown(absolute, recursive);
        for (const nestedPath of nested) {
          files.push(nestedPath);
        }
      }
      continue;
    }

    if (!entry.name.toLowerCase().endsWith('.md')) {
      continue;
    }
    files.push(absolute);
  }

  return files;
}

async function ensureUniqueFilename(dir: string, filename: string): Promise<string> {
  let next = filename;
  let suffix = 1;
  while (true) {
    try {
      await fs.access(path.join(dir, next));
      const parsed = path.parse(filename);
      next = `${parsed.name}_${suffix}${parsed.ext}`;
      suffix += 1;
    } catch {
      return next;
    }
  }
}

function extractTopic(raw: string, fallbackName: string): string {
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const fromHeading = trimmed.startsWith('#') ? trimmed.replace(/^#+\s*/, '') : trimmed;
    const slug = slugify(fromHeading);
    if (slug) {
      return slug.slice(0, 60);
    }
  }

  const fallback = slugify(path.parse(fallbackName).name);
  return fallback || 'untitled';
}

const outputSchema = z.object({
  root: z.string(),
  dryRun: z.boolean(),
  processed: z.number(),
  renamed: z.array(
    z.object({
      oldPath: z.string(),
      newPath: z.string(),
    }),
  ),
});

export default class FilesRenameMarkdown extends Command {
  static description = 'Normalize markdown file names';
  static summary = 'Normalize markdown file names';

  static override args = {
    path: Args.string({
      name: 'path',
      required: false,
      description: 'Directory path',
      default: '.',
    }),
  };

  static override flags = {
    recursive: Flags.boolean({
      description: 'Search recursively',
      default: false,
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be renamed without making changes',
      default: false,
    }),
    type: Flags.string({
      description: 'File type prefix',
      default: 'note',
    }),
    limit: Flags.integer({
      description: 'Maximum number of files to rename',
      required: false,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { args, flags } = await this.parse(FilesRenameMarkdown);

    const root = path.resolve(process.cwd(), args.path);
    let selected: string[];

    try {
      const rootStat = await fs.stat(root);
      if (!rootStat.isDirectory()) {
        this.error(`Path is not a directory: ${root}`, {
          exit: 4,
          code: 'PATH_NOT_DIRECTORY',
        });
      }
      const markdownFiles = await collectMarkdown(root, flags.recursive);
      selected = flags.limit === undefined ? markdownFiles : markdownFiles.slice(0, flags.limit);
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      this.error(
        error instanceof Error ? error.message : 'Failed to read markdown files',
        {
          exit: 3,
          code: 'FILES_RENAME_FAILED',
        }
      );
    }

    const renamed: Array<{ oldPath: string; newPath: string }> = [];
    for (const absolute of selected) {
      let content: string;
      try {
        content = await fs.readFile(absolute, 'utf-8');
      } catch (error) {
        this.error(
          error instanceof Error ? error.message : `Failed to read ${absolute}`,
          {
            exit: 3,
            code: 'FILES_READ_FAILED',
          }
        );
      }

      const topic = extractTopic(content, absolute);
      const normalizedType = slugify(flags.type) || 'note';
      const name = `${datePrefix()}-${normalizedType}-${topic}.md`;
      const nextName = await ensureUniqueFilename(path.dirname(absolute), name);
      const destination = path.join(path.dirname(absolute), nextName);

      if (absolute === destination) {
        continue;
      }

      if (!flags['dry-run']) {
        if (!destination.startsWith(root)) {
          this.error('Refusing to write outside requested root path', {
            exit: 4,
            code: 'WRITE_BOUNDARY_VIOLATION',
          });
        }
        try {
          await fs.rename(absolute, destination);
        } catch (error) {
          this.error(
            error instanceof Error ? error.message : `Failed to rename ${absolute}`,
            {
              exit: 3,
              code: 'FILES_RENAME_FAILED',
            }
          );
        }
      }

      renamed.push({
        oldPath: absolute,
        newPath: destination,
      });
    }

    const output = {
      root,
      dryRun: flags['dry-run'],
      processed: selected.length,
      renamed,
    };

    validateWithZod(outputSchema, output);
    return output;
  }
}
