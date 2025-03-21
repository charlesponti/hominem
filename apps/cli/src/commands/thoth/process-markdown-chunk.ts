import { LLMProvider } from '@ponti/utils/llm'
import logger from '@ponti/utils/logger'
import { generateObject } from 'ai'
import { Command } from 'commander'
import { createWriteStream } from 'fs-extra'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import fs from 'node:fs/promises'
import path from 'node:path'
import ora from 'ora'
import { nullable, z } from 'zod'
import { getPathFiles } from '../../utils/get-path-files'

// New interface for chunk processing options
interface ProcessMarkdownChunksOptions {
  output: string
  model: string
  provider: LLMProvider['config']['provider']
}

// New command for processing markdown chunks
export const processMarkdownChunksCommand = new Command('process-markdown-chunks')
  .description('Process markdown files by chunks and create JSON files with NLP analysis')
  .argument('<path>', 'Path to process markdown files or directory')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-m, --model <model>', 'Model to use for enhancement')
  .option('-p, --provider <provider>', 'NLP provider to use', 'lmstudio')
  .action(async (processPath: string, options: ProcessMarkdownChunksOptions) => {
    // Prepare output file and stream
    const outputDir = path.resolve(__dirname, options.output)
    if (!(await fs.exists(outputDir))) {
      fs.mkdir(outputDir, { recursive: true })
    }
    const outputFilePath = path.join(outputDir, 'output_chunks.json')

    // Initialize the JSON structure
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

        const fileContent = await fs.readFile(file, 'utf-8')

        const splitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
          separators: ['\n\n', '#', '##', '###', '####', '#####', '######'],
          chunkSize: 1000,
          chunkOverlap: 20,
        })

        const splitDocuments = await splitter.createDocuments([fileContent])

        const llmProvider = new LLMProvider({
          provider: options.provider,
          model: options.model,
        })

        let chunkIndex = 0
        for (const doc of splitDocuments) {
          chunkIndex++
          const chunkCountText = `Chunk: ${chunkIndex} / ${splitDocuments.length}`
          processorSpinner.text = `Processing ${fileCountText} | ${chunkCountText}`

          const response = await generateObject({
            model: llmProvider.getModel(),
            prompt: `
              Analyze the following journal entry and extract the elements matching the provided JSON schema.
              
              The user wants to know the following elements that are mentioned in the text:
              - events: things that the person did
              - thoughts: things that the person thought
              - places: places that the person visited
              - people: people mentioned
              
              "${doc.pageContent}"
              `,
            schema: z.object({
              events: z
                .array(
                  z.object({
                    type: z.string().describe('Type of event'),
                    description: z.string().describe('Description of the event'),
                    raw: z.string().describe('Raw event content'),
                    timestamp: z.string().nullable(),
                  })
                )
                .describe('things that the person did'),
              thoughts: z
                .array(
                  z.object({
                    type: z.string().describe('Type of thought'),
                    description: z.string().describe('the thought mentioned'),
                  })
                )
                .describe('thoughts that the person had'),
              places: z
                .array(
                  z.object({
                    type: z.string().describe('Type of place'),
                    name: z.string().describe('n of the place'),
                  })
                )
                .describe('places that the person visited'),
              people: z
                .array(
                  z.object({
                    name: z.string().describe('Name of the person'),
                    role: z.string().describe('Role of the person in the context'),
                  })
                )
                .describe('people mentioned in the text'),
            }),
          })
          const isLast = index === files.length && chunkIndex === splitDocuments.length
          outputStream.write(
            `${JSON.stringify(
              {
                filePath: file,
                chunk: doc.pageContent,
                metadata: doc.metadata,
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
