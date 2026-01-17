import axios from 'axios'
import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'
import ora from 'ora'
import { getAuthToken } from '@/utils/auth.utils'

export const command = new Command('scrape')
  .description('Scrape SM Growers website for plant data')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4040')
  .action(async (options) => {
    const spinner = ora('Scraping SM Growers website').start()
    try {
      const token = getAuthToken()
      const headers = { Authorization: `Bearer ${token}` }

      const response = await axios.post(
        `http://${options.host}:${options.port}/api/scrape/smgrowers`,
        {},
        {
          headers,
        }
      )

      spinner.succeed(chalk.green('SM Growers website scraped successfully'))
      consola.info(chalk.cyan('Scraping Result:'))
      consola.info(JSON.stringify(response.data, null, 2))
    } catch (error) {
      spinner.fail(chalk.red('Failed to scrape SM Growers website'))
      consola.error(chalk.red('Error scraping SM Growers website:'), error)
      process.exit(1)
    }
  })

export default command
