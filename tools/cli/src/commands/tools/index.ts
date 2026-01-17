import { Command } from 'commander'

import { command as csvToJsonCommand } from '../csv-to-json'
import resumeToJSONCommand from './resume-to-json'

export const command = new Command('tools')
  .description('Utility tools')
  // If csv-to-json is intended to be under tools, add it here.
  // Otherwise, remove this comment and the import if it lives elsewhere.
  .addCommand(csvToJsonCommand)
  .addCommand(resumeToJSONCommand)

export default command
