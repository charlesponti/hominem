import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function getPathFiles(
  source: string,
  { extension } = { extension: '.md' }
): Promise<string[]> {
  let files = []
  const isDirectory = (await fs.stat(source)).isDirectory()

  if (isDirectory) {
    files = (await fs.readdir(source, { recursive: true }))
      // filter files by extension
      .filter((file) => file.endsWith(extension))
      // use full path to file
      .map((file) => path.join(source, file))
  } else {
    files.push(source)
  }

  return files
}
