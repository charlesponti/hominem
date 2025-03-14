import { Command } from 'commander'
import ora from 'ora'
import { queryTransactions } from '../analyzer'
import logger from '../logger'

const command = new Command()

command
  .name('query')
  .description('Query transactions from the database')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--category <category>', 'Filter by category')
  .option('--min <amount>', 'Minimum amount')
  .option('--max <amount>', 'Maximum amount')
  .option('--account <account>', 'Filter by account')
  .option('--limit <number>', 'Limit results', '100')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    const spinner = ora('Querying transactions').start()
    
    try {
      const results = await queryTransactions(options)
      spinner.succeed(`Found ${results.length} transactions`)
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2))
      } else {
        console.table(results.map(r => ({
          date: r.date,
          name: r.name,
          amount: r.amount.toFixed(2),
          category: r.category || 'Uncategorized',
          account: r.accountName
        })))
      }
    } catch (error) {
      spinner.fail('Query failed')
      logger.error(error)
      console.error(`Error querying transactions: ${error instanceof Error ? error.message : error}`)
      process.exit(1)
    }
  })

export default command