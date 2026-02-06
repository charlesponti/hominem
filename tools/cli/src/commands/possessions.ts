import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import { consola } from 'consola';
import ora from 'ora';

import { getAuthToken } from '@/utils/auth';

export const command = new Command()
  .name('possessions')
  .description('Client for interacting with the API server');

command
  .command('list')
  .description('List all possessions')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4040')
  .action(async (options) => {
    const spinner = ora('Fetching possessions').start();
    try {
      // Get auth token if available
      let token: string | undefined;
      try {
        token = await getAuthToken();
      } catch (_e) {
        spinner.warn('Not authenticated. Some features may be limited.');
      }

      // Include auth token in headers if available
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `http://${options.host}:${options.port}/api/finance/accounts`,
        {
          headers,
        },
      );
      spinner.succeed('Possessions fetched successfully\n');
      consola.info(JSON.stringify(response.data, null, 2));
      consola.success(chalk.green('Possessions data fetched and saved successfully.'));
    } catch (error) {
      consola.error('Error fetching possessions:', error);
      spinner.fail('Failed to fetch possessions');
      consola.error(chalk.red('Error fetching or saving possessions data:'), error);
      process.exit(1);
    }
  });

export default command;
