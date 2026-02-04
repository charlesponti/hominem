import fs from 'node:fs/promises';

export async function getMarkdownFile(filepath: string): Promise<string> {
  // Check that the file exists
  if (!(await fs.stat(filepath)).isFile()) {
    throw new Error(`File not found: ${filepath}`);
  }

  const content = await fs.readFile(filepath, 'utf-8');
  return content;
}
