import { Command } from 'commander'

import { command as csvToJsonCommand } from '../csv-to-json'

export const command = new Command('convert')
  .description('Convert between different file formats')
  .addCommand(csvToJsonCommand)

export default command
