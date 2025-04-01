import { logger } from '@/logger'
import Table from 'cli-table3'
import { Command } from 'commander'
import { google } from 'googleapis'
import fs from 'node:fs'
import path from 'node:path'
import { googleClient } from './auth'

export const program = new Command()

program.name('sheets')

program
  .command('get-data')
  .description('Fetch data from a Google Sheet')
  .requiredOption('-s, --spreadsheetId <spreadsheetId>', 'Spreadsheet ID')
  .requiredOption('-r, --range <range>', 'Range to fetch data from')
  .option('--download', 'Download data to a file')
  .option('--format <format>', 'Output format (csv, json)', 'json')
  .option('--output <output>', 'Output file path')
  .action(async (options) => {
    try {
      const data = await getSpreadsheetData(options)
      logger.info('Spreadsheet data:', data)

      if (!data) {
        logger.error('No data found in the spreadsheet')
        return
      }

      if (options.download) {
        // Default output path if not provided
        const outputPath =
          options.output || path.join(process.cwd(), `sheet-data-${Date.now()}.${options.format}`)

        let content = ''

        if (options.format === 'csv') {
          // Convert data to CSV
          content = data.map((row) => row.join(',')).join('\n')
        } else {
          // Default to JSON
          content = JSON.stringify(data, null, 2)
        }

        fs.writeFileSync(outputPath, content)
        logger.info(`Data saved to ${outputPath}`)
      }
    } catch (error) {
      logger.error('Error fetching spreadsheet data:', error)
    }
  })

program
  .command('list-sheets')
  .description('List all sheets of a Google Spreadsheet')
  .requiredOption('-s, --spreadsheetId <spreadsheetId>', 'Spreadsheet ID')
  .action(async (options) => {
    try {
      const sheetsList = await listSpreadsheetSheets(options)
      logger.info('Sheet Names:', sheetsList)
    } catch (error) {
      logger.error('Error listing sheets:', error)
    }
  })

program
  .command('list-spreadsheets')
  .description('List all spreadsheets in your Google Drive')
  .action(async () => {
    try {
      const spreadsheets = await listAllSpreadsheets()

      if (!spreadsheets) {
        logger.error('No spreadsheets found')
        return
      }

      const table = new Table({
        head: ['Name', 'ID'],
      })

      for (const sheet of spreadsheets) {
        table.push([sheet.name, sheet.id])
      }

      console.log(table.toString())
    } catch (error) {
      logger.error('Error listing spreadsheets:', error)
    }
  })

export async function getSpreadsheetData({
  spreadsheetId,
  range,
}: { spreadsheetId: string; range: string }) {
  const client = await googleClient.authorize()

  const sheets = google.sheets({ version: 'v4', auth: client })
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  return response.data.values
}

export async function listSpreadsheetSheets({ spreadsheetId }: { spreadsheetId: string }) {
  const client = await googleClient.authorize()

  if (!client) {
    throw new Error('No client found')
  }

  const sheets = google.sheets({ version: 'v4', auth: client })
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  })
  return response.data.sheets?.map((sheet) => sheet.properties?.title)
}

export async function listAllSpreadsheets() {
  const client = await googleClient.authorize()

  if (!client) {
    throw new Error('No client found')
  }

  const drive = google.drive({ version: 'v3', auth: client })
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    fields: 'files(id, name)',
  })

  return response.data.files
}
