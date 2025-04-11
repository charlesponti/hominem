import { logger } from '@/logger'
import { getMarkdownFile } from '@/utils'
import { LLMProvider } from '@hominem/utils/llm'
import { MarkdownProcessor } from '@hominem/utils/markdown'
import { TextAnalysisSchema } from '@hominem/utils/schemas'
import { generateObject } from 'ai'
import { Command } from 'commander'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ora from 'ora'
import { getPathFiles } from '../../utils/get-path-files'

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
    const outputStream = createWriteStream(outputFilePath)
    outputStream.write('[\n')

    try {
      const files = await getPathFiles(processPath, { extension: '.md' })
      const shortPath = path.dirname(processPath).split('/').slice(-1).join('/')

      logger.info(`Processing ${files.length} files in ${shortPath} by chunks`)

      let index = 0
      let totalCost = 0
      const processorSpinner = ora().start()

      for (const file of files) {
        index++
        const fileCountText = `File: ${index} / ${files.length}`
        processorSpinner.text = `Processing ${fileCountText}`

        const processor = new MarkdownProcessor()
        const content = await getMarkdownFile(file)
        const chunks = await processor.getChunks(content)

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

              Context:
              - Parent file: ${file}
              - Parent file path: ${shortPath}
            `,
            schema: TextAnalysisSchema,
          })

          const cost = response.usage.totalTokens

          // Increase the total cost of the current processing
          totalCost += cost

          outputStream.write(
            `${JSON.stringify(
              {
                filePath: file,
                chunk: chunk,
                analysis: response.object,
                tokenCost: cost,
              },
              null,
              2
            )}${isLast ? '' : ',\n'}`
          )
        }
      }
      processorSpinner.succeed(`Processed ${files.length} files by chunks`)
      logger.info(`Output streamed to ${outputFilePath}. Total cost: ${totalCost} tokens`)
    } catch (error) {
      logger.error('Error processing markdown file by chunks:', error)
      process.exit(1)
    } finally {
      // Close the JSON array
      outputStream.write('\n]')
      outputStream.end()
      process.exit(0)
    }
  })

export default processMarkdownChunksCommand
