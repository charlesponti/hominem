import { Command } from 'commander'
import accountsCommand from './commands/accounts'
import analyzeCommand from './commands/analyze'
import buildCommand from './commands/build'
import cleanupCommand from './commands/cleanup'
import exportCommand from './commands/export'
import fixAccountNamesCommand from './commands/fix-account-names'
import queryCommand from './commands/query'

const program = new Command()
program.version('1.0.0')

program.name('transactions').description('Process and analyze financial transactions')

program.addCommand(buildCommand)
program.addCommand(queryCommand)
program.addCommand(analyzeCommand)
program.addCommand(exportCommand)
program.addCommand(cleanupCommand)
program.addCommand(accountsCommand)
program.addCommand(fixAccountNamesCommand)

export default program
