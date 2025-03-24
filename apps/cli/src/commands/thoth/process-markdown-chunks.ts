import { LLMProvider } from '@ponti/utils/llm'
import logger from '@ponti/utils/logger'
import { TextAnalysisSchema } from '@ponti/utils/nlp'
import { generateObject } from 'ai'
import { Command } from 'commander'
import { createWriteStream } from 'fs-extra'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ora from 'ora'
import { getPathFiles } from '../../utils/get-path-files'
import { MarkdownProcessor } from './markdown/markdown-processor'

interface ProcessMarkdownChunksOptions {
  output: string
  model: string
  provider: LLMProvider['config']['provider']
}

export const processMarkdownChunksCommand = new Command('process-markdown-chunks')
  .description('Process markdown files by chunks and create JSON files with NLP analysis')
  .argument('<path>', 'Path to process markdown files or directory')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-m, --model <model>', 'Model to use for enhancement')
  .option('-p, --provider <provider>', 'NLP provider to use', 'lmstudio')
  .action(async (processPath: string, options: ProcessMarkdownChunksOptions) => {
    // Prepare output file and stream
    const outputDir = path.resolve(process.cwd(), options.output)
    if (!(await fs.exists(outputDir))) {
      fs.mkdir(outputDir, { recursive: true })
    }
    const outputFilePath = path.join(outputDir, 'output_chunks.json')

    // Create write stream for output file
    const outputStream = createWriteStream(outputFilePath)
    outputStream.write('[\n')

    try {
      const files = await getPathFiles(processPath, { extension: '.md' })
      const shortPath = path.dirname(processPath).split('/').slice(-1).join('/')

      logger.info(`Processing ${files.length} files in ${shortPath} by chunks`)

      let index = 0
      const processorSpinner = ora().start()

      for (const file of files) {
        index++
        const fileCountText = `File: ${index} / ${files.length}`
        processorSpinner.text = `Processing ${fileCountText}`

        const processor = new MarkdownProcessor()
        const chunks = await processor.getChunks(file)

        const llmProvider = new LLMProvider({
          provider: options.provider,
          model: options.model,
        })

        let chunkIndex = 0
        for (const chunk of chunks) {
          chunkIndex++
          const isLast = index === files.length && chunkIndex === chunks.length
          const chunkCountText = `Chunk: ${chunkIndex} / ${chunks.length}`
          processorSpinner.text = `Processing ${fileCountText} | ${chunkCountText}`

          const response = await generateObject({
            model: llmProvider.getModel(),
            prompt: `
              Analyze the following journal entry and extract the elements matching the provided JSON schema.
              "${chunk}"
              `,
            schema: TextAnalysisSchema,
          })

          outputStream.write(
            `${JSON.stringify(
              {
                filePath: file,
                chunk: chunk,
                ...response,
              },
              null,
              2
            )}${isLast ? '' : ',\n'}`
          )
        }
      }

      // Close the JSON array
      const finalOutputStream = createWriteStream(outputFilePath, { flags: 'a' })
      finalOutputStream.write('\n]')
      finalOutputStream.end()

      processorSpinner.succeed(`Processed ${files.length} files by chunks`)
      logger.info(`Output streamed to ${outputFilePath}`)
    } catch (error) {
      // Close the JSON array
      const finalOutputStream = createWriteStream(outputFilePath, { flags: 'a' })
      finalOutputStream.write('\n]')
      finalOutputStream.end()
      console.error(error)
      logger.error('Error processing markdown file by chunks:', error)
      process.exit(1)
    }
  })

export default processMarkdownChunksCommand
