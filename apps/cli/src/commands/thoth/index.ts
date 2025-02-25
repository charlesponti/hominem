import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import ora from 'ora'
import { getPathFiles } from '../../utils/get-path-files'
import { enhanceCommand } from './enhance'
import { MarkdownProcessor, type ProcessedMarkdownFileEntry } from './markdown/markdown-processor'

const program = new Command()

program.name('thoth').description('Writing tools')

program
  .command('process-markdown')
  .description('Process markdown files and create JSON files for bullet points')
  .argument('<path>', 'Path to process markdown files')
  .option('-o, --output <dir>', 'Output directory', './output')
  .action(async (processPath: string, options: { output: string }) => {
    try {
      const processor = new MarkdownProcessor()
      const results: ProcessedMarkdownFileEntry[] = []
      const files = await getPathFiles(processPath, { extension: '.md' })

      const processorSpinner = ora().start(
        `Processing markdown ${files.length} files in ${processPath
          .split('/')
          .slice(processPath.split('/').length - 2, processPath.split('/').length)
          .join('/')}\n`
      )
      for (const file of files) {
        const content = await processor.processFileWithAst(file)
        results.push(...content.entries)
      }
      processorSpinner.succeed(`Processed ${files.length} files`)

      const outputDir = path.resolve(options.output)
      await fs.writeFile(path.join(outputDir, 'output.json'), JSON.stringify(results, null, 2))
    } catch (error) {
      logger.error('Error processing markdown file:', error)
      process.exit(1)
    }
  })

program.addCommand(enhanceCommand)

export default program
