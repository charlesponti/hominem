import { logger } from '@/logger'
import { Command } from 'commander'
import { google } from 'googleapis'
import fs from 'node:fs'
import { env } from '../env'
import { CLI_GOOGLE_TOKEN_PATH, googleClient } from './auth'
import { calendarProgram } from './calendar'
import { program as sheetsProgram } from './sheets'

const program = new Command()

program.name('google')
program.addCommand(calendarProgram)
program.addCommand(sheetsProgram)

program
  .command('auth')
  .description('Google authentication commands')
  .option('--check', 'Check authentication status')
  .option('--reset', 'Remove Google tokens to force re-authentication')
  .action(async (options) => {
    if (options.check) {
      try {
        // Try to authorize to check if we have valid tokens
        const client = await googleClient.authorize()
        if (client) {
          logger.info('✅ Google authentication is active and working')

          // Try to get some basic info to confirm it's working
          try {
            const calendar = google.calendar({ version: 'v3', auth: client })
            const calendars = await calendar.calendarList.list({ maxResults: 1 })
            if (calendars.data.items?.length) {
              logger.info(
                `Connected to Google account with access to ${calendars.data.items.length} calendars`
              )
            }
          } catch (err) {
            logger.warn('Token seems valid but calendar access failed')
          }
        }
      } catch (err) {
        logger.error('❌ Google authentication check failed')
        logger.info('To authenticate with Google:')
        logger.info('1. Connect your Google account in the web app settings')
        logger.info('2. Run `hominem api auth` to save your tokens for CLI use')
      }
    } else if (options.reset) {
      // Remove Google tokens
      fs.rmSync(CLI_GOOGLE_TOKEN_PATH, { force: true })
      logger.info('Google token file removed successfully')
      logger.info('To reconnect with Google:')
      logger.info('1. Reconnect your Google account in the web app if needed')
      logger.info('2. Run `hominem api auth` to fetch new tokens')
    } else {
      logger.info('Google authentication is now handled through the web app')
      logger.info('To authenticate with Google:')
      logger.info('1. Connect your Google account in the web app settings')
      logger.info('2. Run `hominem api auth` to save your tokens for CLI use')

      // Check if we have Clerk tokens
      if (fs.existsSync(CLI_GOOGLE_TOKEN_PATH)) {
        logger.info('\nCurrent status: ✅ Google tokens found')
        logger.info('You can use Google commands right away')
        logger.info('Run `hominem google auth --check` to verify token validity')
      } else {
        logger.info('\nCurrent status: ❌ No Google tokens found')
      }
    }
  })
export default program
