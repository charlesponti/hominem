import { logger } from '@/logger'
import axios from 'axios'
import { Command } from 'commander'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import open from 'open'
import ora from 'ora'

// Auth command for the CLI
const command = new Command()
  .command('auth')
  .description('Authenticate the CLI with your Hominem account')
  .option('-t, --token <token>', 'Directly provide an authentication token')
  .option('-w, --web-url <url>', 'Web app URL', 'http://localhost:4444')
  .option('-o, --open', 'Open the authentication page in a browser', false)
  .action(async (options) => {
    const configDir = path.join(os.homedir(), '.hominem')
    const configFile = path.join(configDir, 'config.json')

    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    // If token is provided directly, save it
    if (options.token) {
      const spinner = ora('Saving authentication token').start()

      try {
        const config = {
          token: options.token,
          timestamp: new Date().toISOString(),
        }

        fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
        spinner.succeed('Authentication token saved successfully')
        logger.info(`Token saved to ${configFile}`)

        // Try to fetch Google tokens from the web API using the token
        spinner.start('Checking for Google account integration')
        try {
          const url = new URL(options.webUrl)
          const response = await axios.get(`${url.href}/api/auth/cli`, {
            headers: {
              Authorization: `Bearer ${options.token}`,
            },
          })

          if (response.data.googleTokens && response.data.googleTokens.length > 0) {
            // Save Google tokens to a separate file
            const googleTokensPath = path.join(configDir, 'google-token.json')
            fs.writeFileSync(googleTokensPath, JSON.stringify(response.data.googleTokens, null, 2))
            spinner.succeed('Google authentication tokens saved successfully')
            logger.info(`Google tokens saved to ${googleTokensPath}`)
            logger.info('You can now use Google commands in the CLI!')
          } else {
            spinner.info('No Google account connected. Google commands may not work.')
            logger.info('Connect your Google account in the web app to use Google commands.')
          }
        } catch (err) {
          spinner.warn('Could not retrieve Google tokens')
          logger.info('To use Google commands, connect your Google account in the web app.')
        }

        process.exit(0)
      } catch (error) {
        logger.error('Error saving token', error)
        spinner.fail('Failed to save token')
        process.exit(1)
      }
    }

    // Otherwise, open the web authentication flow
    const authUrl = `${options.webUrl}/auth/cli?from=cli`
    logger.info(`\nPlease authenticate in your browser at: ${authUrl}`)
    logger.info(
      'After authentication, copy the token and run this command again with --token option'
    )

    if (options.open) {
      await open(authUrl)
    }
  })

export default command
