import axios from 'axios'
import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'
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
        spinner.succeed(chalk.green('Authentication token saved successfully'))
        consola.info(`Token saved to ${chalk.blue(configFile)}`)

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
            spinner.succeed(chalk.green('Google authentication tokens saved successfully'))
            consola.info(`Google tokens saved to ${chalk.blue(googleTokensPath)}`)
            consola.info(chalk.green('You can now use Google commands in the CLI!'))
          } else {
            spinner.info(chalk.yellow('No Google account connected. Google commands may not work.'))
            consola.info('Connect your Google account in the web app to use Google commands.')
          }
        } catch (err) {
          spinner.warn(chalk.yellow('Could not retrieve Google tokens'))
          consola.info('To use Google commands, connect your Google account in the web app.')
        }

        process.exit(0)
      } catch (error) {
        consola.error(chalk.red('Error saving token'), error)
        spinner.fail(chalk.red('Failed to save token'))
        process.exit(1)
      }
    }

    // Otherwise, open the web authentication flow
    const authUrl = `${options.webUrl}/auth/cli?from=cli`
    consola.info(`Please authenticate in your browser at: ${chalk.blue.underline(authUrl)}`)
    consola.info(
      `After authentication, copy the token and run: '${chalk.bold('hominem auth --token <token>')}.`
    )

    if (options.open) {
      await open(authUrl)
    }
  })

export default command
