import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { enhanceCommand } from './enhance'
import { MarkdownProcessor } from './markdown/markdown-processor'
import { processDirectoryCommand } from './markdown/process-directory'

const program = new Command()

program.name('thoth').description('Writing tools')
program
  .command('process-markdown', { isDefault: true })
  .description('Process markdown files and create JSON files for bullet points')
  .argument('<file>', 'Path to markdown file')
  .option('-o, --output <dir>', 'Output directory', './output')
  .action(async (file: string, options: { output: string }) => {
    try {
      const processor = new MarkdownProcessor()
      const content = await processor.processFile(file)
      const outputDir = path.resolve(options.output)
      await fs.writeFile(path.join(outputDir, 'output.json'), JSON.stringify(content, null, 2))
    } catch (error) {
      logger.error('Error processing markdown file:', error)
      process.exit(1)
    }
  })

program.addCommand(processDirectoryCommand)
program.addCommand(enhanceCommand)

export default program
