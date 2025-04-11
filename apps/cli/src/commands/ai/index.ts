import { logger } from '@/logger'
import { lmstudio } from '@/utils/lmstudio'
import { google } from '@ai-sdk/google'
import { educationalProfileSchema, professionalProfileSchema } from '@ponti/utils/schemas'
import { generateObject, generateText } from 'ai'
import { Command } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ora from 'ora'
import PDFParser from 'pdf2json'
import { z } from 'zod'

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
  .command('resume-to-json')
  .description('Analyze a PDF file')
  .requiredOption('--filepath <filepath>', 'Path to the PDF file')
  .option('--outfile <outfile>', 'Output file name')
  .option('--outdir <outdir>', 'Output file directory')
  .action(async (options) => {
    if (!options.outdir && !options.outfile) {
      console.error('Output file or directory not specified')
      process.exit(1)
    }

    const outputFile =
      options.outfile || (options.outdir && path.resolve(options.outdir, 'output/resume.json'))
    const spinner = ora().start('Processing PDF file...')

    if (!fs.existsSync(path.dirname(outputFile))) {
      fs.mkdirSync(path.dirname(outputFile), { recursive: true })
    }

    try {
      const pdfParser = new PDFParser(this, true)

      const pdfText = await new Promise((resolve, reject) => {
        pdfParser.loadPDF(options.filepath)

        pdfParser.on('pdfParser_dataReady', () => {
          const text = pdfParser.getRawTextContent()
          resolve(text)
        })

        pdfParser.on('pdfParser_dataError', reject)
      })

      spinner.text = 'Generating JSON...'
      const response = await generateObject({
        model: google('gemini-2.0-flash-exp'),
        schema: z.object({
          description: z.string(),
          education: educationalProfileSchema,
          professional: professionalProfileSchema,
        }),
        messages: [
          {
            role: 'user',
            content: `Analyze the attached PDF: ${pdfText}`,
          },
        ],
      })

      spinner.succeed('JSON generated successfully')
      logger.info(`Writing JSON to file: ${outputFile}`)
      fs.writeFileSync(outputFile, JSON.stringify(response.object, null, 2))
      process.exit(0)
    } catch (error) {
      logger.error(`Error reading or processing PDF: ${error}`)
      console.error(error)
      process.exit(1)
    }
  })
