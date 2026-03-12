import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { createCommand } from '../../command-factory';
import { CliError } from '../../errors';

export default createCommand({
  name: 'skills export',
  summary: 'Copy the local `.github/skills` folder to another location',
  description:
    "This command makes it easy to package up or copy the current repository's skill files so they can be reused in a new project.  Destination will be created if necessary.",
  argNames: ['dest'],
  args: z.object({
    dest: z.string().default('.'),
  }),
  flags: z.object({}),
  outputSchema: z.object({
    source: z.string(),
    dest: z.string(),
    fileCount: z.number(),
  }),
  async run({ args, context }) {
    const source = path.resolve(context.cwd, '.github/skills');
    const dest = path.resolve(context.cwd, args.dest);

    try {
      const stat = await fs.stat(source);
      if (!stat.isDirectory()) {
        throw new CliError({
          code: 'SKILLS_NOT_DIRECTORY',
          category: 'validation',
          message: `source path is not a directory: ${source}`,
        });
      }
    } catch (err) {
      if (err instanceof CliError) throw err;
      throw new CliError({
        code: 'SKILLS_SOURCE_MISSING',
        category: 'dependency',
        message: `failed to read skills directory at ${source}`,
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

      return {
        source,
        dest,
        fileCount,
      };
    } catch (err) {
      throw new CliError({
        code: 'SKILLS_EXPORT_FAILED',
        category: 'dependency',
        message: err instanceof Error ? err.message : 'export failed',
      });
    }
  },
});
