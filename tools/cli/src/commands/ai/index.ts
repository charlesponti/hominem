import axios from 'axios'
import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'
import ora from 'ora'
import { getAuthToken } from '@/utils/auth.utils'

import { askCommand } from './ask'
import { command as generateCommand } from './generate'
import { invokeCommand } from './invoke'

const listModelsCommand = new Command('list-models')
  .description('List available AI models')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4040')
  .action(async (options) => {
    const spinner = ora('Fetching available AI models').start()
    try {
      const token = getAuthToken()
      const headers = { Authorization: `Bearer ${token}` }

      const response = await axios.get(`http://${options.host}:${options.port}/api/ai/models`, {
        headers,
      })

      spinner.succeed(chalk.green('Available AI models fetched successfully'))
      consola.info(JSON.stringify(response.data, null, 2))
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch AI models'))
      consola.error(chalk.red('Error fetching AI models:'), error)
      process.exit(1)
    }
  })

export const command = new Command('ai')
  .name('ai')
  .description('Interact with AI models')
  .addCommand(askCommand)
  .addCommand(invokeCommand)
  .addCommand(generateCommand)
  .addCommand(listModelsCommand)

export default command
