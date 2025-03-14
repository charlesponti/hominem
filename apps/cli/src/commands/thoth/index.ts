import { Command } from 'commander'
import processMarkdownCommand from './process-markdown'
import { queryJsonCommand } from './query-json'

const program = new Command()

program.name('thoth').description('Writing tools')

program.addCommand(processMarkdownCommand)
program.addCommand(queryJsonCommand)

export default program
