import { Command } from 'commander'

// Commands
import importTransactions from './import-transactions'
import changeAccount from './change-account-name.ts'

const program = new Command()
program.version('1.0.0')

program.name('finance').description('Finance tools')

program.addCommand(importTransactions)
program.addCommand(changeAccount)

export default program
