import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { URL } from 'node:url'
import axios from 'axios'
import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'
import open from 'open'
import ora from 'ora'

// Auth command for the CLI
const command = new Command()
  .command('auth')
  .description('Authenticate the CLI with your Hominem account')
  .option('-t, --token <token>', 'Directly provide an authentication token')
  .option('-w, --web-url <url>', 'Web app URL', 'http://localhost:4444')
  .option('-p, --port <port>', 'Port for the local server', '3000')
  .action(async (options) => {
    const configDir = path.join(os.homedir(), '.hominem')
    const configFile = path.join(configDir, 'config.json')

    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    // Function to save the token
    const saveTokens = async (accessToken: string, refreshToken?: string) => {
      const spinner = ora('Saving authentication token').start()
      try {
        const config: { token: string; refreshToken?: string; timestamp: string } = {
          token: accessToken,
          timestamp: new Date().toISOString(),
        }
        if (refreshToken) {
          config.refreshToken = refreshToken
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
              Authorization: `Bearer ${accessToken}`,
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
        } catch (_err) {
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

    // If token is provided directly, save it
    if (options.token) {
      await saveTokens(options.token)
    }

    // Otherwise, open the web authentication flow
    const server = http.createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400).end('Bad Request')
        return
      }

      const requestUrl = new URL(req.url, `http://localhost:${options.port}`)
      const accessToken = requestUrl.searchParams.get('token')
      const refreshToken = requestUrl.searchParams.get('refresh_token')

      if (accessToken) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          '<h1>Authentication Successful!</h1><p>You can close this tab and return to the CLI.</p>'
        )
        server.close()
        await saveTokens(accessToken, refreshToken || undefined)
      } else {
        res.writeHead(400).end('No token found in the callback URL.')
      }
    })

    server.listen(options.port, async () => {
      const authUrl = `${options.webUrl}/auth/cli?from=cli&redirect_uri=http://localhost:${options.port}`
      consola.info(`Opening your browser to: ${chalk.blue.underline(authUrl)}`)
      consola.info('Please complete the authentication in your browser.')
      await open(authUrl)
    })

    server.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') {
        consola.error(
          chalk.red(
            `Port ${options.port} is already in use. Please specify a different port using --port.`
          )
        )
      } else {
        consola.error(chalk.red('Failed to start local server:'), e)
      }
      process.exit(1)
    })
  })

export default command
