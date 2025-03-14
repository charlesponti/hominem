import { Command } from 'commander'
import axios from 'axios'
import ora from 'ora'
import Table from 'cli-table3'

const command = new Command()
  .name('api')
  .description('Client for interacting with the API server')

command
  .command('health')
  .description('Check the API server health')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .action(async (options) => {
    const spinner = ora('Checking API health').start()
    try {
      const response = await axios.get(`http://${options.host}:${options.port}/health`)
      spinner.succeed('API is healthy')
      console.log(JSON.stringify(response.data, null, 2))
    } catch (error) {
      spinner.fail(`Failed to connect to API: ${error.message}`)
      if (error.response) {
        console.error('Response data:', error.response.data)
      }
      process.exit(1)
    }
  })

command
  .command('notes')
  .description('List all notes')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .action(async (options) => {
    const spinner = ora('Fetching notes').start()
    try {
      const response = await axios.post(
        `http://${options.host}:${options.port}/trpc/notes.list`,
        {}
      )
      spinner.succeed('Notes fetched successfully')
      console.log(JSON.stringify(response.data.result.data, null, 2))
    } catch (error) {
      spinner.fail(`Failed to fetch notes: ${error.message}`)
      if (error.response) {
        console.error('Response data:', error.response.data)
      }
      process.exit(1)
    }
  })

command
  .command('create-note')
  .description('Create a new note')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .option('-c, --content <content>', 'Note content', 'Test note')
  .action(async (options) => {
    const spinner = ora('Creating note').start()
    try {
      const response = await axios.post(
        `http://${options.host}:${options.port}/trpc/notes.create`,
        {
          json: {
            details: {
              content: options.content
            }
          }
        }
      )
      spinner.succeed('Note created successfully')
      console.log(JSON.stringify(response.data.result.data, null, 2))
    } catch (error) {
      spinner.fail(`Failed to create note: ${error.message}`)
      if (error.response) {
        console.error('Response data:', error.response.data)
      }
      process.exit(1)
    }
  })

command
  .command('generate-email')
  .description('Generate a masked email')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .option('-u, --user-id <userId>', 'User ID', () => `user-${Date.now()}`)
  .action(async (options) => {
    const spinner = ora('Generating masked email').start()
    try {
      const response = await axios.post(
        `http://${options.host}:${options.port}/trpc/email.generateEmail`,
        {
          json: {
            userId: options.userId
          }
        }
      )
      spinner.succeed('Masked email generated successfully')
      console.log(JSON.stringify(response.data.result.data, null, 2))
    } catch (error) {
      spinner.fail(`Failed to generate masked email: ${error.message}`)
      if (error.response) {
        console.error('Response data:', error.response.data)
      }
      process.exit(1)
    }
  })

// Finance API Commands
const finance = command.command('finance')
  .description('Finance-related API commands')

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
      )}`;
      
      const response = await axios.get(url)
      
      spinner.succeed('Accounts fetched successfully')
      
      const accounts = response.data.result.data
      
      if (options.json) {
        console.log(JSON.stringify(accounts, null, 2))
      } else {
        const table = new Table({
          head: ['ID', 'Name', 'Mask', 'Type', 'Institution', 'Active'],
          style: { head: ['cyan'] }
        })
        
        accounts.forEach(account => {
          table.push([
            account.id,
            account.name,
            account.mask || '-',
            account.type || '-',
            account.institution || '-',
            account.isActive ? 'Yes' : 'No'
          ])
        })
        
        console.log(table.toString())
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
        limit: parseInt(options.limit, 10)
      };
      
      const url = `http://${options.host}:${options.port}/trpc/finance.queryTransactions?input=${encodeURIComponent(
        JSON.stringify(params)
      )}`;
      
      const response = await axios.get(url)
      
      spinner.succeed('Transactions retrieved successfully')
      
      const transactions = response.data.result.data
      
      if (options.json) {
        console.log(JSON.stringify(transactions, null, 2))
      } else {
        const table = new Table({
          head: ['Date', 'Name', 'Amount', 'Category', 'Account'],
          style: { head: ['cyan'] },
          colWidths: [12, 40, 12, 20, 25]
        })
        
        transactions.forEach(tx => {
          const amount = tx.amount.toFixed(2)
          const amountStr = tx.amount >= 0 ? `$${amount}` : `-$${Math.abs(tx.amount).toFixed(2)}`
          
          table.push([
            tx.date,
            tx.name.length > 37 ? tx.name.substring(0, 37) + '...' : tx.name,
            amountStr,
            tx.category || '-',
            tx.account || '-'
          ])
        })
        
        console.log(table.toString())
        console.log(`\nTotal: ${transactions.length} transactions`)
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
  .option('--dimension <dim>', 'Analysis dimension (category, month, merchant, account)', 'category')
  .option('--top <n>', 'Show top N results', '10')
  .option('--json', 'Output in JSON format', false)
  .action(async (options) => {
    if (!['category', 'month', 'merchant', 'account'].includes(options.dimension)) {
      console.error(`Invalid dimension: ${options.dimension}. Must be one of: category, month, merchant, account`)
      process.exit(1)
    }
    
    const spinner = ora(`Analyzing transactions by ${options.dimension}`).start()
    try {
      const params = {
        from: options.from,
        to: options.to,
        dimension: options.dimension,
        top: parseInt(options.top, 10)
      };
      
      const url = `http://${options.host}:${options.port}/trpc/finance.analyzeTransactions?input=${encodeURIComponent(
        JSON.stringify(params)
      )}`;
      
      const response = await axios.get(url)
      
      spinner.succeed('Analysis complete')
      
      const result = response.data.result.data
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`\nTotal transactions: ${result.totalTransactions}`)
        console.log(`Total amount: $${Math.abs(result.totalAmount).toFixed(2)}`)
        console.log(`\nBreakdown by ${options.dimension}:`)
        
        const table = new Table({
          head: [options.dimension.charAt(0).toUpperCase() + options.dimension.slice(1), 'Amount', 'Count', '% of Total'],
          style: { head: ['cyan'] }
        })
        
        result.results.forEach(item => {
          const name = options.dimension === 'category' ? item.category :
                     options.dimension === 'month' ? item.month :
                     options.dimension === 'merchant' ? item.merchant : item.account
          
          const amount = Math.abs(item.totalAmount).toFixed(2)
          const percentage = ((Math.abs(item.totalAmount) / Math.abs(result.totalAmount)) * 100).toFixed(1)
          
          table.push([
            name,
            `$${amount}`,
            item.count,
            `${percentage}%`
          ])
        })
        
        console.log(table.toString())
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
        to: options.to
      };
      
      const url = `http://${options.host}:${options.port}/trpc/finance.getFinanceSummary?input=${encodeURIComponent(
        JSON.stringify(params)
      )}`;
      
      const response = await axios.get(url)
      
      spinner.succeed('Summary retrieved successfully')
      
      const summary = response.data.result.data
      
      if (options.json) {
        console.log(JSON.stringify(summary, null, 2))
      } else {
        // Print summary table
        console.log('\n=== FINANCIAL SUMMARY ===')
        console.log(`Transactions: ${summary.transactionCount}`)
        console.log(`Accounts: ${summary.accountCount}`)
        console.log(`Income: $${summary.income.toFixed(2)}`)
        console.log(`Expenses: -$${Math.abs(summary.expenses).toFixed(2)}`)
        console.log(`Net Cashflow: ${summary.netCashflow >= 0 ? '+' : '-'}$${Math.abs(summary.netCashflow).toFixed(2)}`)
        
        console.log('\n=== TOP EXPENSE CATEGORIES ===')
        const table = new Table({
          head: ['Category', 'Amount'],
          style: { head: ['cyan'] }
        })
        
        summary.topExpenseCategories.forEach(cat => {
          table.push([
            cat.category,
            `$${cat.amount.toFixed(2)}`
          ])
        })
        
        console.log(table.toString())
      }
    } catch (error) {
      spinner.fail(`Failed to retrieve financial summary: ${error.message}`)
      if (error.response) {
        console.error('Response data:', error.response.data)
      }
      process.exit(1)
    }
  })

export default command