import { Command } from 'commander'
import { pullCommand } from './pull.js'
import { syncCommand } from './sync.js'

export const command = new Command('notion').description('Notion database tools')

command.addCommand(pullCommand)
command.addCommand(syncCommand)
