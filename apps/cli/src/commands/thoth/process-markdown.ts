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

function getFileShortPath(filePath: string) {
  return filePath.split('/').slice(-2).join('/')
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
      const shortPath = path.dirname(processPath).split('/').slice(-1).join('/')

      logger.info(`Processing ${files.length} files in ${shortPath}`)
      const headings = new Map<string, ProcessedMarkdownFileEntry[]>()

      let index = 0
      const processorSpinner = ora().start()
      for (const file of files) {
        const fileShortPath = getFileShortPath(file)
        processorSpinner.text = `Processing (${++index} / ${files.length}) ${fileShortPath}`
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

      const outputFilePath = path.join(outputDir, 'output.json')
      await fs.writeFile(
        outputFilePath,
        JSON.stringify(
          Array.from(headings.entries()).map(([heading, entries]) => ({
            heading,
            entries,
          })),
          null,
          2
        )
      )
      logger.info(`Output written to ${outputFilePath}`)
    } catch (error) {
      logger.error('Error processing markdown file:', error)
      process.exit(1)
    }
  })
