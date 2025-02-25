import { Command } from 'commander'
import { enhanceCommand } from './enhance'
import processMarkdownCommand from './process-markdown'

const program = new Command()

program.name('thoth').description('Writing tools')

program.addCommand(enhanceCommand)
program.addCommand(processMarkdownCommand)

export default program
