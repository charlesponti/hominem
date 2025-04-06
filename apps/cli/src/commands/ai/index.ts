import { logger } from '@/logger'
import { lmstudio } from '@/utils/lmstudio'
import { google } from '@ai-sdk/google'
import { generateObject, generateText } from 'ai'
import { Command } from 'commander'
import * as fs from 'node:fs'
import { z } from 'zod'

const pdfParse = require('pdf-parse')

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

    console.info(`Question:\n${options.question}`)
    console.info(`Answer:\n${response.text}`)
  })

command
  .command('pdf-analyze')
  .description('Analyze a PDF file')
  .requiredOption('--filepath <filepath>', 'Path to the PDF file')
  .action(async (options) => {
    try {
      logger.info(`Reading PDF file: ${options.filepath}`)
      const pdfContent = await fs.promises.readFile(options.filepath)
      const pdfData = await pdfParse(pdfContent)

      const response = await generateObject({
        model: google('gemini-1.5-flash'),
        schema: z.object({
          answer: z.string(),
        }),
        messages: [
          {
            role: 'user',
            content: `Analyze the attached PDF: ${pdfData.text}`,
          },
        ],
      })

      logger.info(`FINAL PDF ANALYZE: ${JSON.stringify(response.object, null, 2)}`)
    } catch (error) {
      logger.error(`Error reading or processing PDF: ${error}`)
    }
  })
