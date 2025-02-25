import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import fs from 'node:fs/promises'
import path from 'node:path'
import { MarkdownProcessor } from './markdown-processor'

export async function getFilesFromPath(
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

export const processDirectoryCommand = new Command()
  .command('process-directory')
  .description('Process markdown files in a directory')
  .requiredOption('-d, --dir <directory>', 'Directory containing markdown files')
  .option('-o, --output <file>', 'Output JSON file', 'processed_data.json')
  .action(async (options) => {
    try {
      const processor = new MarkdownProcessor()
      // Get all markdown files from the directory
      const files = await getFilesFromPath(options.dir, { extension: '.md' })

      const result = []

      for (const file of files) {
        const content = await processor.processFile(path.join(options.dir, file))
        result.push(
          ...content.headings,
          ...content.paragraphs,
          ...content.bulletPoints,
          ...content.others
        )
      }

      const outputFilePath = path.resolve('out', options.output)

      // write the output to the file
      await fs.writeFile(outputFilePath, JSON.stringify(result, null, 2), 'utf-8')

      logger.info(`✅ Processed ${files.length} files`)
      logger.info(`📝 Output written to ${outputFilePath}`)
    } catch (error) {
      logger.error('Error processing files:', error)
      process.exit(1)
    }
  })
