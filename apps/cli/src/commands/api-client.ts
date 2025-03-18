import { logger } from '@ponti/utils/logger'
import axios from 'axios'
import { Command } from 'commander'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import open from 'open'
import ora from 'ora'

const command = new Command().name('api').description('Client for interacting with the API server')

command
  .command('health')
  .description('Check the API server health')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .action(async (options) => {
    const spinner = ora('Checking API health').start()
    try {
      // Try to get auth token if available
      let token: ReturnType<typeof getAuthToken>
      try {
        token = getAuthToken()
      } catch (e) {
        // Continue without token for health check
      }

      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await axios.get(`http://${options.host}:${options.port}/health`, { headers })

      spinner.succeed('API is healthy')
      logger.info(JSON.stringify(response.data, null, 2))

      // If we have a token, verify it
      if (token) {
        try {
          const authResponse = await axios.get(
            `http://${options.host}:${options.port}/auth/verify`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          logger.info('\nAuthentication status:')
          logger.info(JSON.stringify(authResponse.data, null, 2))
        } catch (err) {
          logger.info('\nAuthentication failed. Please re-authenticate with `hominem api auth`')
        }
      } else {
        logger.info('\nTip: Authenticate with `hominem api auth` to access more features')
      }
    } catch (error) {
      logger.error('Error checking API health:', error)
      spinner.fail('Failed to connect to API')
      process.exit(1)
    }
  })

command
  .command('notes')
  .description('List all notes')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .action(async (options) => {
    const spinner = ora('Fetching notes').start()
    try {
      // Get auth token if available
      let token: ReturnType<typeof getAuthToken>
      try {
        token = getAuthToken()
      } catch (e) {
        spinner.warn('Not authenticated. Some features may be limited.')
      }

      // Include auth token in headers if available
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const response = await axios.post(
        `http://${options.host}:${options.port}/trpc/notes.list`,
        {},
        { headers }
      )
      spinner.succeed('Notes fetched successfully')
      logger.info(JSON.stringify(response.data.result.data, null, 2))
    } catch (error) {
      logger.error('Error fetching notes:', error)
      spinner.fail('Failed to fetch notes')
      process.exit(1)
    }
  })

command
  .command('create-note')
  .description('Create a new note')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .option('-c, --content <content>', 'Note content', 'Test note')
  .action(async (options) => {
    const spinner = ora('Creating note').start()
    try {
      // Get auth token if available
      let token: ReturnType<typeof getAuthToken>
      try {
        token = getAuthToken()
      } catch (e) {
        spinner.fail('Authentication required. Please run `hominem api auth` first.')
        process.exit(1)
      }

      // Include auth token in headers
      const headers = { Authorization: `Bearer ${token}` }

      const response = await axios.post(
        `http://${options.host}:${options.port}/trpc/notes.create`,
        {
          json: {
            details: {
              content: options.content,
            },
          },
        },
        { headers }
      )
      spinner.succeed('Note created successfully')
      logger.info(JSON.stringify(response.data.result.data, null, 2))
    } catch (error) {
      logger.error('Error creating note:', error)
      spinner.fail('Failed to create note')
      process.exit(1)
    }
  })

command
  .command('generate-email')
  .description('Generate a masked email')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4445')
  .option('-u, --user-id <userId>', 'User ID', () => `user-${Date.now()}`)
  .action(async (options) => {
    const spinner = ora('Generating masked email').start()
    try {
      // Get auth token if available
      let token: ReturnType<typeof getAuthToken>
      try {
        token = getAuthToken()
      } catch (e) {
        spinner.fail('Authentication required. Please run `hominem api auth` first.')
        process.exit(1)
      }

      // Include auth token in headers
      const headers = { Authorization: `Bearer ${token}` }

      const response = await axios.post(
        `http://${options.host}:${options.port}/trpc/email.generateEmail`,
        {
          json: {
            userId: options.userId,
          },
        },
        { headers }
      )
      spinner.succeed('Masked email generated successfully')
      logger.info(JSON.stringify(response.data.result.data, null, 2))
    } catch (error) {
      logger.error('Error generating masked email:', error)
      spinner.fail('Failed to generate masked email')
      process.exit(1)
    }
  })

// Auth command for the CLI
command
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
          const response = await axios.get(
            `${url.protocol}//${url.hostname}:${url.port || '3000'}/api/auth/cli`,
            {
              headers: {
                Authorization: `Bearer ${options.token}`,
              },
            }
          )

          if (response.data.googleTokens) {
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

// Helper function to get the auth token - to be used by other commands
export function getAuthToken() {
  const configFile = path.join(os.homedir(), '.hominem', 'config.json')

  if (!fs.existsSync(configFile)) {
    console.error('Not authenticated. Please run `hominem api auth` first')
    process.exit(1)
  }

  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))
    return config.token
  } catch (error) {
    logger.error('Error reading auth token', error)
    process.exit(1)
  }
}

// Helper function to create an authenticated axios client
export function getAuthenticatedClient(host = 'localhost', port = '4445') {
  // Get auth token
  const token = getAuthToken()

  // Create an axios instance with the auth token
  const client = axios.create({
    baseURL: `http://${host}:${port}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return client
}

export default command
