import { getAuthToken } from '@/utils/auth.utils'
import axios from 'axios'
import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'
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

      spinner.succeed(chalk.green('API is healthy'))
      consola.info(JSON.stringify(response.data, null, 2))
      consola.success(chalk.green('Health data fetched and saved successfully.'))

      // If we have a token, verify it
      if (token) {
        try {
          const authResponse = await axios.get(
            `http://${options.host}:${options.port}/auth/verify`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          consola.info('\nAuthentication status:')
          consola.info(JSON.stringify(authResponse.data, null, 2))
        } catch (err) {
          consola.info('\nAuthentication failed. Please re-authenticate with `hominem api auth`')
        }
      } else {
        consola.info('\nTip: Authenticate with `hominem api auth` to access more features')
      }
    } catch (error) {
      consola.error(chalk.red('Error checking API health:'), error)
      spinner.fail(chalk.red('Failed to connect to API'))
      consola.error(chalk.red('Error fetching or saving health data:'), error)
      process.exit(1)
    }
  })

export default command
