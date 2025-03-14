import { Command } from 'commander'

// Commands
import importTransactions from './import-transactions'
import changeAccount from './change-account-name.ts'
import transactionsCommand from './transactions'

const program = new Command()
program.version('1.0.0')

program.name('finance').description('Finance tools')

program.addCommand(importTransactions)
program.addCommand(changeAccount)
program.addCommand(transactionsCommand)

export default program
