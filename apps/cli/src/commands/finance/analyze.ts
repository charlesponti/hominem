import { Command } from 'commander'
import ora from 'ora'
import { findTopMerchants, summarizeByCategory, summarizeByMonth } from './transactions/analyzer'
import logger from './transactions/logger'

const command = new Command()

command
  .name('analyze')
  .description('Analyze transaction data')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--by <dimension>', 'Analyze by dimension (category, month, merchant)', 'category')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .option('--top <number>', 'Top N results', '10')
  .action(async (options) => {
    const spinner = ora(`Analyzing transactions by ${options.by}`).start()

    try {
      let results

      switch (options.by.toLowerCase()) {
        case 'category':
          results = await summarizeByCategory(options)
          break
        case 'month':
          results = await summarizeByMonth(options)
          break
        case 'merchant':
          results = await findTopMerchants(options)
          break
        default:
          throw new Error(`Unknown analysis dimension: ${options.by}`)
      }

      spinner.succeed(`Analysis complete`)

      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2))
      } else {
        console.table(results)
      }
    } catch (error) {
      spinner.fail('Analysis failed')
      logger.error(error)
      console.error(
        `Error analyzing transactions: ${error instanceof Error ? error.message : error}`
      )
      process.exit(1)
    }
  })

export default command
