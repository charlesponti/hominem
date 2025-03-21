import { logger } from '@ponti/utils/logger'
import { generateObject, generateText, streamObject } from 'ai'
import { Command } from 'commander'
import * as fs from 'node:fs'
import { z } from 'zod'
import { lmstudio } from '../../utils/lmstudio'

export const command = new Command()

command.name('ai')

command
  .command('qa')
  .description('get answer to a question')
  .requiredOption('-q, --question <text>', 'question to answer')
  .action(async (options) => {
    const response = await generateText({
      model: lmstudio('gemma-3-12b-it'),
      prompt: `Provide a concise answer to the following question:\n${options.question}`,
    })

    logger.info(`Answer: ${response.text}`)
  })

command
  .command('pdf-analyze')
  .description('Analyze a PDF file')
  .requiredOption('--filepath <filepath>', 'Path to the PDF file')
  .action(async (options) => {
    try {
      logger.info(`Reading PDF file: ${options.filepath}`)
      const pdfBuffer = await fs.promises.readFile(options.filepath)
      // Assuming the PDF is text-based, you might need a library like 'pdf-parse' for complex PDFs
      const pdfContent = pdfBuffer.toString('utf-8')

      const response = await generateObject({
        model: lmstudio('gemma-3-12b-it'),
        prompt: 'what is capital of France?',
        schema: z.object({
          answer: z.string(),
        }),
      })

      logger.info(`FINAL PDF ANALYZE: ${JSON.stringify(response.object, null, 2)}`)
    } catch (error) {
      logger.error(`Error reading or processing PDF: ${error}`)
    }
  })
