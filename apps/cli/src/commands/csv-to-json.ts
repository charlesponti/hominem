import { parse } from 'csv-parse'
import { format } from 'date-fns'
import * as fs from 'node:fs/promises'
import * as path from 'node:path' // Added import for path module
import { Command } from 'commander'

async function convertCsv(inputFile: string, outputFile: string): Promise<void> {
  try {
    const fileContent = await fs.readFile(inputFile, 'utf-8')

    const results: Record<string, string>[] = []

    const parser = parse(fileContent, {
      columns: true, // Use the header row to determine columns
      skip_empty_lines: true,
    })

    for await (const row of parser) {
      const inputRow = row
      const keys = Object.keys(inputRow).map((key) => key.trim().replace(/\s/g, '_').toLowerCase())
      const values = Object.values(inputRow) as string[]

      const outputRow = keys.reduce(
        (acc, key, index) => {
          acc[key] = values[index]
          return acc
        },
        {} as Record<string, string>
      )

      results.push(outputRow)
    }

    await fs.writeFile(outputFile, JSON.stringify(results, null, 2), 'utf-8')
    console.log(`JSON conversion complete. Output written to ${outputFile}`)
    return
  } catch (error) {
    console.error('Error during CSV conversion:', error)
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return '' // Handle empty date strings
  try {
    const parsedDate = new Date(dateString)
    return format(parsedDate, 'yyyy-MM-dd') // Customize date format as needed
  } catch (error) {
    console.warn(`Invalid date format: ${dateString}.  Returning original string.`, error)
    return dateString // Return original string if parsing fails
  }
}

function parseNumber(numString: string): number {
  const num = Number(numString)
  return Number.isNaN(num) ? 0 : num // Return 0 if parsing fails
}

function convertToCsv(data: Record<string, string>[]): string {
  if (data.length === 0) return ''

  const header = Object.keys(data).join(',')
  const rows = data.map((row) => Object.values(row).join(','))
  return `${header}\n${rows.join('\n')}`
}

const program = new Command()

program
  .version('1.0.0')
  .description('Convert CSV file with date and number formatting.')
  .requiredOption('-i, --input <file>', 'Input CSV file')
  // Removed the output option
  //	.requiredOption("-o, --output <file>", "Output CSV file")
  .action(async (options) => {
    const inputFile = options.input
    // Compute output file path: same directory as the CSV with '.json' extension
    const outputFile = path.join(
      path.dirname(inputFile),
      `${path.basename(inputFile, path.extname(inputFile))}.json`
    )
    await convertCsv(inputFile, outputFile)
  })

program.parse(process.argv)
