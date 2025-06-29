import { Command } from 'commander'
import { importCommand } from './import'

export const command = new Command('notes')
  .description('Manage notes and import content from various sources')
  .addCommand(importCommand)

export default command 
