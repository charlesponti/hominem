import { Command } from 'commander'
import { importCommand } from './import'
import { rewriteCommand } from './rewrite'

export const command = new Command('notes')
  .description('Manage notes and import content from various sources')
  .addCommand(importCommand)
  .addCommand(rewriteCommand)

export default command
