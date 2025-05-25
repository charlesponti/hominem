import { Command } from 'commander'
import { mergeTransactionsCommand } from './merge-transactions'

export const command = new Command('finance')
  .description('Financial transaction utilities')
  .addCommand(mergeTransactionsCommand)

export default command
