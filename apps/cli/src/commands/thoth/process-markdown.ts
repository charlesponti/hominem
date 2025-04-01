import { logger } from '@/logger'
import { NLPProcessor } from '@ponti/utils/nlp'
import { Command } from 'commander'
import { createWriteStream } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import ora from 'ora'
import { db } from '../../db'
import { markdownEntries } from '../../db/schema'
import { getPathFiles } from '../../utils/get-path-files'
import { MarkdownProcessor } from './markdown/markdown-processor'

interface ProcessMarkdownOptions {
  output: string
  enhanced: boolean
  model: string
  provider: string
  store: boolean // New option to store in database
}

export default new Command('process-markdown')
  .command('process-markdown')
  .description('Process markdown files and create JSON files for bullet points')
  .argument('<path>', 'Path to process markdown files')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-e, --enhanced', 'Should the output be enhanced')
  .option('-m, --model <model>', 'Model to use for enhancement')
  .option('-p, --provider <provider>', 'NLP provider to use', 'lmstudio')
  .option('-s, --store', 'Store processed entries in database', false) // Add store option
  .action(async (processPath: string, options: ProcessMarkdownOptions) => {
    try {
      const processor = new MarkdownProcessor()
      const files = await getPathFiles(processPath, { extension: '.md' })
      const shortPath = path.dirname(processPath).split('/').slice(-1).join('/')

      logger.info(`Processing ${files.length} files in ${shortPath}`)

      // Prepare output file and stream
      let outputDir = path.resolve(options.output)
      if (!(await fs.exists(outputDir))) {
        outputDir = path.dirname(processPath)
      }
      const outputFilePath = path.join(outputDir, 'output.json')

      // Initialize the JSON structure
      const outputStream = createWriteStream(outputFilePath)
      outputStream.write('[\n')

      const results = []
      let index = 0
      const processorSpinner = ora().start()
      for (const file of files) {
        index++
        const fileCountText = `File: ${index} / ${files.length}`
        processorSpinner.text = `Processing ${fileCountText}`
        const content = await processor.processFileWithAst(file)

        let entryIndex = 0
        for (const entry of content.entries) {
          entryIndex++
          const entryTextCountText = `Entry: ${entryIndex} / ${content.entries.length}`
          processorSpinner.text = `Processing ${fileCountText} | ${entryTextCountText}`

          if (options.enhanced) {
            const nlpProcessor = new NLPProcessor({
              // biome-ignore lint/suspicious/noExplicitAny: <explanation>
              provider: options.provider as any,
              model: options.model,
            })
            let contentIndex = 0
            for (const entryContent of entry.content) {
              contentIndex++
              processorSpinner.text = `Processing ${fileCountText} | ${entryTextCountText} | ${entry.heading}: ${contentIndex} / ${entry.content.length}`
              const analysis = await nlpProcessor.analyzeText(entryContent.text)
              entryContent.textAnalysis = analysis

              results.push({
                filePath: file,
                ...entryContent,
              })

              // write to output file
              const isLast = index === files.length && entryIndex === content.entries.length
              outputStream.write(
                `${JSON.stringify(
                  {
                    filePath: file,
                    ...entryContent,
                  },
                  null,
                  2
                )}${isLast ? '' : ',\n'}`
              )
              // If store option is enabled, save to database
              if (options.store) {
                try {
                  processorSpinner.text = `Storing entry "${entry.heading}" in database...`

                  // Store the markdown entry in database
                  await db
                    .insert(markdownEntries)
                    .values({
                      filePath: file,
                      processingDate: new Date(),
                      text: entryContent.text,
                      section: entry.heading,
                      isTask: entryContent.isTask,
                      isComplete: entryContent.isComplete,
                      textAnalysis: JSON.stringify(entryContent.textAnalysis),
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    })
                    .returning()

                  processorSpinner.text = `Entry "${entry.heading}" stored in database`
                } catch (dbError) {
                  logger.error(`Failed to store entry in database: ${dbError}`)
                }
              }
            }
          }
        }
      }

      // Close the JSON array
      const finalOutputStream = createWriteStream(outputFilePath, { flags: 'a' })
      finalOutputStream.write('\n]')
      finalOutputStream.end()

      processorSpinner.succeed(
        `Processed ${files.length} files${options.store ? ' and stored in database' : ''}`
      )
      logger.info(`Output streamed to ${outputFilePath}`)
    } catch (error) {
      console.error(error)
      logger.error('Error processing markdown file:', error)
      process.exit(1)
    }
  })
