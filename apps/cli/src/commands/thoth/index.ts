import { Command } from 'commander'

import { command as queryCommand } from './query'

export const command = new Command('thoth')
  .description('Interact with the Thoth knowledge engine')
  .addCommand(queryCommand)

export default command
