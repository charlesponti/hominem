import { Command } from 'commander'
import { markdownCommand } from './markdown'
import { enhanceCommand } from './enhance'

const program = new Command()

program.name('thoth').description('Writing tools')
program.addCommand(markdownCommand)
program.addCommand(enhanceCommand)

export default program
