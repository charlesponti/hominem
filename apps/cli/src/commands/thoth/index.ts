import { Command } from 'commander'
import processMarkdownCommand from './process-markdown'
import processMarkdownChunkCommand from './process-markdown-chunks'

const program = new Command()

program.name('thoth').description('Writing tools')

program.addCommand(processMarkdownCommand)
program.addCommand(processMarkdownChunkCommand)

export default program
