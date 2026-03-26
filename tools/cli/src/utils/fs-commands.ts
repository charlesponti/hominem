import fs from 'node:fs/promises';
import path from 'node:path';

export async function assertDirectoryPath(directoryPath: string): Promise<void> {
  const stat = await fs.stat(directoryPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${directoryPath}`);
  }
}

export async function assertFilePath(filePath: string): Promise<void> {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    throw new Error(`Path is not a file: ${filePath}`);
  }
}

export async function countFiles(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let fileCount = 0;

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fileCount += await countFiles(absolutePath);
    } else {
      fileCount += 1;
    }
  }

  return fileCount;
}

export async function copyDirectoryAndCount(source: string, dest: string): Promise<number> {
  await fs.mkdir(dest, { recursive: true });
  await fs.cp(source, dest, { recursive: true, force: true });
  return countFiles(dest);
}

export async function readFilePreview(
  filePath: string,
  lineCount: number,
): Promise<{ lineCount: number; preview: string[] }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  return {
    lineCount: lines.length,
    preview: lines.slice(0, lineCount),
  };
}

export async function collectFiles(
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
