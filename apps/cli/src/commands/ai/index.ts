import { Command } from 'commander'
import { askCommand } from './ask'
import { invokeCommand } from './invoke'

export const command = new Command()

command.name('ai')

command.addCommand(askCommand)
command.addCommand(invokeCommand)
