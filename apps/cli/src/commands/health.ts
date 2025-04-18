import { getAuthToken } from '@/utils/auth.utils'
import { logger } from '@/utils/logger'
import axios from 'axios'
import { Command } from 'commander'
import ora from 'ora'

export const command = new Command()
  .command('health')
  .description('Check the API server health')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4040')
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
      const response = await axios.get(`http://${options.host}:${options.port}/status`, { headers })

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
