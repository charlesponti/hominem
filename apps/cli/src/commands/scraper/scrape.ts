import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'

import { getAuthToken } from '@/utils/auth.utils'
import axios from 'axios'
import ora from 'ora'

export const command = new Command('scrape')
  .description('Scrape a website')
  .requiredOption('-u, --url <url>', 'URL to scrape')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4040')
  .action(async (options) => {
    const spinner = ora(`Scraping ${chalk.blue(options.url)}`).start()
    try {
      const token = getAuthToken()
      const headers = { Authorization: `Bearer ${token}` }

      const response = await axios.post(
        `http://${options.host}:${options.port}/api/scrape`,
        {
          url: options.url,
        },
        {
          headers,
        }
      )

      spinner.succeed(chalk.green('Website scraped successfully'))
      consola.info(chalk.cyan('Scraped Content:'))
      // Potentially large output, consider summarizing or saving to file
      consola.info(JSON.stringify(response.data, null, 2))
    } catch (error) {
      spinner.fail(chalk.red('Failed to scrape website'))
      consola.error(chalk.red('Error scraping website:'), error)
      process.exit(1)
    }
  })

export default command
