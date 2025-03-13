import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import fs from 'node:fs'
import { env } from '../env'
import { TOKEN_PATH } from './auth'
import { calendarProgram } from './calendar'
import { program as sheetsProgram } from './sheets'

const program = new Command()

program.name('google')
program.addCommand(calendarProgram)
program.addCommand(sheetsProgram)

program.command('auth').action(() => {
  fs.rmSync(TOKEN_PATH, { force: true })
  logger.info('Token file removed successfully.')
})
export default program
