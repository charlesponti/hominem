import fs from 'node:fs/promises';

import { countFiles } from './fs-commands';

interface SkillsTransferCommandOptions {
  sourceNotDirectoryMessage: (source: string) => string;
  missingSourceMessage: (source: string) => string;
  sourcePath: (cwd: string, value: string) => string;
  destPath: (cwd: string, value: string) => string;
}

async function assertDirectoryExists(directoryPath: string): Promise<void> {
  const stat = await fs.stat(directoryPath);

  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${directoryPath}`);
  }
}

export async function copySkillsDirectory(
  options: SkillsTransferCommandOptions,
  cwd: string,
  value: string,
): Promise<{ source: string; dest: string; fileCount: number }> {
  const source = options.sourcePath(cwd, value);
  const dest = options.destPath(cwd, value);

  try {
    await fs.stat(source);
  } catch {
    throw new Error(options.missingSourceMessage(source));
  }

  try {
    await assertDirectoryExists(source);
  } catch {
    throw new Error(options.sourceNotDirectoryMessage(source));
  }

  await fs.mkdir(dest, { recursive: true });
  await fs.cp(source, dest, { recursive: true, force: true });

  return {
    source,
    dest,
    fileCount: await countFiles(dest),
  };
}
