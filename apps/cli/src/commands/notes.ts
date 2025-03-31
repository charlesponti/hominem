import { getAuthToken } from '@/utils/auth.utils'
import { logger } from '@ponti/utils/logger'
import axios from 'axios'
import { Command } from 'commander'
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
