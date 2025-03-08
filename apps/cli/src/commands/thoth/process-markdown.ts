import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import ora from 'ora'
import { getPathFiles } from '../../utils/get-path-files'
import {
  EnhancedMarkdownProcessor,
  MarkdownProcessor,
  type ProcessedMarkdownFileEntry,
} from './markdown/markdown-processor'

interface ProcessMarkdownOptions {
  output: string
  enhanced: boolean
}

export default new Command('process-markdown')
  .command('process-markdown')
  .description('Process markdown files and create JSON files for bullet points')
  .argument('<path>', 'Path to process markdown files')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-e, --enhanced', 'Should the output be enhanced')
  .action(async (processPath: string, options: ProcessMarkdownOptions) => {
    try {
      const processor = options.enhanced ? new EnhancedMarkdownProcessor() : new MarkdownProcessor()
      const files = await getPathFiles(processPath, { extension: '.md' })

      const processorSpinner = ora().start(
        `Processing markdown ${files.length} files in ${processPath
          .split('/')
          .slice(processPath.split('/').length - 2, processPath.split('/').length)
          .join('/')}\n`
      )

      const headings = new Map<string, ProcessedMarkdownFileEntry[]>()
      for (const file of files) {
        const content = await processor.processFileWithAst(file)

        for (const entry of content.entries) {
          if (headings.has(entry.heading)) {
            const existing = headings.get(entry.heading)
            if (existing) {
              existing.push(entry)
            }
          } else {
            headings.set(entry.heading, [entry])
          }
        }
      }
      processorSpinner.succeed(`Processed ${files.length} files`)

      let outputDir = path.resolve(options.output)
      if (!(await fs.exists(outputDir))) {
        outputDir = path.dirname(processPath)
      }

      await fs.writeFile(
        path.join(outputDir, 'output.json'),
        JSON.stringify(
          Array.from(headings.entries()).map(([heading, entries]) => ({
            heading,
            entries,
          })),
          null,
          2
        )
      )
    } catch (error) {
      logger.error('Error processing markdown file:', error)
      process.exit(1)
    }
  })
