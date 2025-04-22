import { Command } from 'commander'
import processMarkdownCommand from './process-markdown'

const program = new Command()

program.name('thoth').description('Writing tools')

program.addCommand(processMarkdownCommand)

export default program
