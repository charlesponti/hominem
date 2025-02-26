import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import csv from 'csv-parser'
import * as fs from 'node:fs'
import * as path from 'node:path'

type CsvRow = Record<string, string>
/**
 * Convert a CSV file to JSON.
 *
 * @param inputFile - Path to the input CSV file
 * @returns A promise that resolves with the JSON data
 */
export async function convertCsv(inputFile: string): Promise<CsvRow[] | null> {
  try {
    return await new Promise<CsvRow[]>((resolve, reject) => {
      const results: CsvRow[] = []
      const stream = fs.createReadStream(inputFile, 'utf-8').pipe(csv())
      stream.on('data', (data) => {
        const keys = Object.keys(data).map((key) => key.trim().replace(/\s/g, '_').toLowerCase())
        const values = Object.values(data) as string[]

        const outputRow = keys.reduce((acc, key, index) => {
          acc[key] = values[index]
          return acc
        }, {} as CsvRow)

        results.push(outputRow)
      })

      stream.on('error', (error) => {
        console.error('Error reading CSV file:', error)
      })

      stream.on('end', () => {
        resolve(results)
      })
    })
  } catch (error) {
    console.error('Error during CSV conversion:', error)
    return null
  }
}

export const command = new Command()

command
  .version('1.0.0')
  .name('csv-to-json')
  .description('Convert CSV file with date and number formatting.')
  .requiredOption('-i, --input <file>', 'Input CSV file')
  .action(async (options) => {
    const inputFile = options.input

    // Compute output file path: same directory as the CSV with '.json' extension
    const outputFile = path.join(
      path.dirname(inputFile),
      `${path.basename(inputFile, path.extname(inputFile))}.json`
    )

    try {
      const jsonData = await convertCsv(inputFile)
      if (jsonData) {
        fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2))
        logger.info(`Successfully converted ${inputFile} to ${outputFile}`)
      } else {
        logger.warn(`No data converted from ${inputFile}.`)
      }
    } catch (error) {
      logger.error('Failed to convert CSV to JSON:', error)
    }
  })
