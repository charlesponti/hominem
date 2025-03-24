import { Command } from 'commander'
import ora from 'ora'
import path from 'path'
import { exportTransactionsToCSV } from './transactions/exporter'
import logger from './transactions/logger'

const command = new Command()

command
  .name('export')
  .description('Export transactions to CSV')
  .option('-o, --output <file>', 'Output CSV file', 'exported-transactions.csv')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--category <category>', 'Filter by category')
  .action(async (options) => {
    const spinner = ora('Exporting transactions').start()

    try {
      const outputPath = path.isAbsolute(options.output)
        ? options.output
        : path.join(process.cwd(), options.output)

      const count = await exportTransactionsToCSV(outputPath, {
        fromDate: options.from,
        toDate: options.to,
        category: options.category,
      })

      spinner.succeed(`Exported ${count} transactions to ${outputPath}`)
    } catch (error) {
      spinner.fail('Export failed')
      logger.error(error)
      console.error(
        `Error exporting transactions: ${error instanceof Error ? error.message : error}`
      )
      process.exit(1)
    }
  })

export default command
