import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import { consola } from 'consola';
import ora from 'ora';

import { getAuthToken } from '@/utils/auth.utils';

export const command = new Command('generate')
  .description('Generate text using an AI model')
  .requiredOption('-m, --model <model>', 'AI model to use')
  .requiredOption('-p, --prompt <prompt>', 'Prompt for the AI model')
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-P, --port <port>', 'API port', '4040')
  .action(async (options) => {
    const spinner = ora(`Generating text with model ${chalk.blue(options.model)}`).start();
    try {
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post(
        `http://${options.host}:${options.port}/api/ai/generate`,
        {
          model: options.model,
          prompt: options.prompt,
        },
        {
          headers,
        },
      );

      spinner.succeed(chalk.green('Text generated successfully'));
      consola.info(chalk.cyan('Generated Text:'));
      consola.info(response.data.generatedText);
    } catch (error) {
      spinner.fail(chalk.red('Failed to generate text'));
      consola.error(chalk.red('Error generating text:'), error);
      process.exit(1);
    }
  });

export default command;
