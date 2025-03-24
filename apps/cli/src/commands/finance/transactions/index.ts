import { Command } from 'commander'
import accountsCommand from '../accounts'
import analyzeCommand from '../analyze'
import buildCommand from '../build'
import cleanupCommand from '../cleanup'
import exportCommand from '../export'
import fixAccountNamesCommand from '../fix-account-names'
import queryCommand from '../query'

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
