import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import fs from 'node:fs/promises'
import path from 'node:path'
import { MarkdownProcessor } from './markdown-processor'

export const processDirectoryCommand = new Command()
  .command('process-directory')
  .description('Process markdown files in a directory')
  .requiredOption('-d, --dir <directory>', 'Directory containing markdown files')
  .option('-o, --output <file>', 'Output JSON file', 'processed_data.json')
  .action(async (options) => {
    try {
      const processor = new MarkdownProcessor()

      const files = await fs.readdir(options.dir)
      const markdownFiles = files.filter((file) => file.endsWith('.md'))

      const result = []

      const output = []

      for (const file of markdownFiles) {
        output.push(await processor.processFile(path.join(options.dir, file)))
      }

      for (const content of output) {
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

      logger.info(`✅ Processed ${markdownFiles.length} files`)
      logger.info(`📝 Output written to ${outputFilePath}`)
    } catch (error) {
      logger.error('Error processing files:', error)
      process.exit(1)
    }
  })
