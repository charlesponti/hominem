import { getAuthToken } from '@/utils/auth.utils'
import { logger } from '@/utils/logger'
import axios from 'axios'
import { Command } from 'commander'
import ora from 'ora'

export const command = new Command()
  .name('possessions')
  .description('Client for interacting with the API server')

command
  .command('list')
  .description('List all possessions')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4040')
  .action(async (options) => {
    const spinner = ora('Fetching possessions').start()
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

      const response = await axios.get(`http://${options.host}:${options.port}/api/possessions`, {
        headers,
      })
      spinner.succeed('Possessions fetched successfully')
      logger.info(JSON.stringify(response.data, null, 2))
    } catch (error) {
      logger.error('Error fetching possessions:', error)
      spinner.fail('Failed to fetch possessions')
      process.exit(1)
    }
  })
