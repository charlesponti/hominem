import { logger } from '@ponti/utils/logger'
import { generateObject, generateText, streamObject } from 'ai'
import { Command } from 'commander'
import * as fs from 'node:fs'
import { z } from 'zod'
import { lmstudio } from '../../utils/lmstudio'
import { get_historical_flight_data } from './transportation.tools'

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

command
  .command('flights')
  .requiredOption('--origin <origin city>', 'Origin city')
  .requiredOption('--destination <destination city>', 'Destination city')
  .action(async (options) => {
    const response = await generateObject({
      model: lmstudio('gemma-3-12b-it'),
      prompt: `
        Based on the following, return the primary airport code for these locations: 
        
        Origin: ${options.origin}
        Destination: ${options.destination}

        For instance, New York City would return JFK, and Los Angeles would return LAX.
        If there are multiple airports, return the one that is most commonly used for international flights.
        If you cannot find the airport code, return "unknown".
        If you are unsure, return "unknown".
      `,
      schema: z.object({
        originCode: z.string(),
        departureCode: z.string(),
      }),
    })
    const { originCode, departureCode } = response.object
    logger.info(`Finding flights from ${originCode} to ${departureCode}`)

    const flightData = await get_historical_flight_data.execute(
      {
        origin: originCode,
        departure: departureCode,
      },
      { messages: [], toolCallId: 'get_flights' }
    )
    const { chart_data: prices } = flightData
    if (prices.length === 0) {
      logger.info('No flight data found.')
      return
    }
    const avgPrice =
      prices.reduce((acc, data) => acc + Number.parseFloat(data.price), 0) / prices.length
    logger.info(
      `The average price to fly from ${originCode} to ${departureCode} is $${avgPrice.toFixed(2)}`
    )
  })
