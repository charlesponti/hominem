import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'

import { getAuthToken } from '@/utils/auth.utils'
import axios from 'axios'
import ora from 'ora'

export const command = new Command('query')
  .description('Query the Thoth knowledge engine')
  .requiredOption('-q, --query <query>', 'Query string')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4040')
  .action(async (options) => {
    const spinner = ora(`Querying Thoth with: ${chalk.blue(options.query)}`).start()
    try {
      const token = getAuthToken()
      const headers = { Authorization: `Bearer ${token}` }

      const response = await axios.post(
        `http://${options.host}:${options.port}/api/thoth/query`,
        {
          query: options.query,
        },
        {
          headers,
        }
      )

      spinner.succeed(chalk.green('Thoth query successful'))
      consola.info(chalk.cyan('Query Result:'))
      consola.info(JSON.stringify(response.data, null, 2))
    } catch (error) {
      spinner.fail(chalk.red('Failed to query Thoth'))
      consola.error(chalk.red('Error querying Thoth:'), error)
      process.exit(1)
    }
  })

export default command
