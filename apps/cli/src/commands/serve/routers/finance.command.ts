import { logger } from '@ponti/utils/logger'
import axios from 'axios'
import Table from 'cli-table3'
import { Command } from 'commander'
import ora from 'ora'

// Finance API Commands
const finance = new Command('finance')
finance.command('finance').description('Finance-related API commands')

// Get accounts
finance
  .command('accounts')
  .description('List all financial accounts')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .option('--active-only', 'Show only active accounts', false)
  .option('--json', 'Output in JSON format', false)
  .action(async (options) => {
    const spinner = ora('Fetching accounts').start()
    try {
      const url = `http://${options.host}:${options.port}/trpc/finance.getAccounts?input=${encodeURIComponent(
        JSON.stringify({ activeOnly: options.activeOnly })
      )}`

      const response = await axios.get(url)

      spinner.succeed('Accounts fetched successfully')

      const accounts = response.data.result.data

      if (options.json) {
        logger.info(JSON.stringify(accounts, null, 2))
      } else {
        const table = new Table({
          head: ['ID', 'Name', 'Mask', 'Type', 'Institution', 'Active'],
          style: { head: ['cyan'] },
        })

        accounts.forEach((account) => {
          table.push([
            account.id,
            account.name,
            account.mask || '-',
            account.type || '-',
            account.institution || '-',
            account.isActive ? 'Yes' : 'No',
          ])
        })

        logger.info(table.toString())
      }
    } catch (error) {
      spinner.fail(`Failed to fetch accounts: ${error.message}`)
      if (error.response) {
        console.error('Response data:', error.response.data)
      }
      process.exit(1)
    }
  })

// Query transactions
finance
  .command('transactions')
  .description('Query financial transactions')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--category <category>', 'Filter by category')
  .option('--search <text>', 'Search term')
  .option('--min <amount>', 'Minimum amount', parseFloat)
  .option('--max <amount>', 'Maximum amount', parseFloat)
  .option('--account <name>', 'Filter by account name')
  .option('--limit <n>', 'Limit results', '100')
  .option('--json', 'Output in JSON format', false)
  .action(async (options) => {
    const spinner = ora('Querying transactions').start()
    try {
      const params = {
        from: options.from,
        to: options.to,
        category: options.category,
        search: options.search,
        minAmount: options.min,
        maxAmount: options.max,
        account: options.account,
        limit: parseInt(options.limit, 10),
      }

      const url = `http://${options.host}:${options.port}/trpc/finance.queryTransactions?input=${encodeURIComponent(
        JSON.stringify(params)
      )}`

      const response = await axios.get(url)

      spinner.succeed('Transactions retrieved successfully')

      const transactions = response.data.result.data

      if (options.json) {
        logger.info(JSON.stringify(transactions, null, 2))
      } else {
        const table = new Table({
          head: ['Date', 'Name', 'Amount', 'Category', 'Account'],
          style: { head: ['cyan'] },
          colWidths: [12, 40, 12, 20, 25],
        })

        transactions.forEach((tx) => {
          const amount = tx.amount.toFixed(2)
          const amountStr = tx.amount >= 0 ? `$${amount}` : `-$${Math.abs(tx.amount).toFixed(2)}`

          table.push([
            tx.date,
            tx.name.length > 37 ? tx.name.substring(0, 37) + '...' : tx.name,
            amountStr,
            tx.category || '-',
            tx.account || '-',
          ])
        })

        logger.info(table.toString())
        logger.info(`\nTotal: ${transactions.length} transactions`)
      }
    } catch (error) {
      spinner.fail(`Failed to query transactions: ${error.message}`)
      if (error.response) {
        console.error('Response data:', error.response.data)
      }
      process.exit(1)
    }
  })

// Analyze transactions
finance
  .command('analyze')
  .description('Analyze financial transactions')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option(
    '--dimension <dim>',
    'Analysis dimension (category, month, merchant, account)',
    'category'
  )
  .option('--top <n>', 'Show top N results', '10')
  .option('--json', 'Output in JSON format', false)
  .action(async (options) => {
    if (!['category', 'month', 'merchant', 'account'].includes(options.dimension)) {
      console.error(
        `Invalid dimension: ${options.dimension}. Must be one of: category, month, merchant, account`
      )
      process.exit(1)
    }

    const spinner = ora(`Analyzing transactions by ${options.dimension}`).start()
    try {
      const params = {
        from: options.from,
        to: options.to,
        dimension: options.dimension,
        top: parseInt(options.top, 10),
      }

      const url = `http://${options.host}:${options.port}/trpc/finance.analyzeTransactions?input=${encodeURIComponent(
        JSON.stringify(params)
      )}`

      const response = await axios.get(url)

      spinner.succeed('Analysis complete')

      const result = response.data.result.data

      if (options.json) {
        logger.info(JSON.stringify(result, null, 2))
      } else {
        logger.info(`\nTotal transactions: ${result.totalTransactions}`)
        logger.info(`Total amount: $${Math.abs(result.totalAmount).toFixed(2)}`)
        logger.info(`\nBreakdown by ${options.dimension}:`)

        const table = new Table({
          head: [
            options.dimension.charAt(0).toUpperCase() + options.dimension.slice(1),
            'Amount',
            'Count',
            '% of Total',
          ],
          style: { head: ['cyan'] },
        })

        result.results.forEach((item) => {
          const name =
            options.dimension === 'category'
              ? item.category
              : options.dimension === 'month'
                ? item.month
                : options.dimension === 'merchant'
                  ? item.merchant
                  : item.account

          const amount = Math.abs(item.totalAmount).toFixed(2)
          const percentage = (
            (Math.abs(item.totalAmount) / Math.abs(result.totalAmount)) *
            100
          ).toFixed(1)

          table.push([name, `$${amount}`, item.count, `${percentage}%`])
        })

        logger.info(table.toString())
      }
    } catch (error) {
      spinner.fail(`Failed to analyze transactions: ${error.message}`)
      if (error.response) {
        console.error('Response data:', error.response.data)
      }
      process.exit(1)
    }
  })

// Get finance summary
finance
  .command('summary')
  .description('Get financial summary')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('--json', 'Output in JSON format', false)
  .action(async (options) => {
    const spinner = ora('Fetching financial summary').start()
    try {
      const params = {
        from: options.from,
        to: options.to,
      }

      const url = `http://${options.host}:${options.port}/trpc/finance.getFinanceSummary?input=${encodeURIComponent(
        JSON.stringify(params)
      )}`

      const response = await axios.get(url)

      spinner.succeed('Summary retrieved successfully')

      const summary = response.data.result.data

      if (options.json) {
        logger.info(JSON.stringify(summary, null, 2))
      } else {
        // Print summary table
        logger.info('\n=== FINANCIAL SUMMARY ===')
        logger.info(`Transactions: ${summary.transactionCount}`)
        logger.info(`Accounts: ${summary.accountCount}`)
        logger.info(`Income: $${summary.income.toFixed(2)}`)
        logger.info(`Expenses: -$${Math.abs(summary.expenses).toFixed(2)}`)
        logger.info(
          `Net Cashflow: ${summary.netCashflow >= 0 ? '+' : '-'}$${Math.abs(summary.netCashflow).toFixed(2)}`
        )

        logger.info('\n=== TOP EXPENSE CATEGORIES ===')
        const table = new Table({
          head: ['Category', 'Amount'],
          style: { head: ['cyan'] },
        })

        summary.topExpenseCategories.forEach((cat) => {
          table.push([cat.category, `$${cat.amount.toFixed(2)}`])
        })

        logger.info(table.toString())
      }
    } catch (error) {
      spinner.fail(`Failed to retrieve financial summary: ${error.message}`)
      if (error.response) {
        console.error('Response data:', error.response.data)
      }
      process.exit(1)
    }
  })
