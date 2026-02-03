import chalk from 'chalk';
import { Command } from 'commander';
import { consola } from 'consola';
import { writeFileSync } from 'node:fs';
import ora from 'ora';

import { rpc } from '../../lib/rpc';

export const invokeCommand = new Command()
  .name('invoke')
  .description('Interact with the AI assistant and invoke tools')
  .argument('<message>', 'Message to send')
  .option('-d, --debug', 'Show debug info')
  .option('--showToolResults', 'Show tool results', false)
  .action(async (message, options) => {
    const spinner = ora('Generating response').start();

    try {
      // Create a new chat for CLI and send the message via Hono RPC
      const createRes = await (rpc as any).api.chats.$post({ json: { title: 'CLI' } });
      const createJson = await createRes.json();
      if (!createJson?.id) {
        throw new Error('Failed to create chat');
      }
      const chatId = createJson.id;

      const sendRes = await (rpc as any).api.chats[':id'].send.$post({
        param: { id: chatId },
        json: { message },
      });
      const response = await sendRes.json();

      // Stop spinner
      spinner.succeed(chalk.green('Success'));

      // Display the message content, if available
      if (response?.messages?.assistant?.content) {
        consola.log(
          `\n${chalk.blue.bold('assistant:')}\n${chalk.white(response.messages.assistant.content)}\n`,
        );
      }

      // Display tool calls if they exist
      if (
        response?.messages?.assistant?.toolCalls &&
        response.messages.assistant.toolCalls.length > 0
      ) {
        consola.log(chalk.yellow.bold('Tool Calls:'));
        for (const toolCall of response.messages.assistant.toolCalls) {
          consola.log(chalk.cyan(`- Tool: ${toolCall.toolName}`));
          consola.log(chalk.cyan(`  Args: ${JSON.stringify(toolCall.args, null, 2)}`));
        }
        consola.log('');
      }

      // Detailed debug info when requested
      if (options.debug) {
        writeFileSync('debug.json', JSON.stringify(response, null, 2));
      }
    } catch (err) {
      spinner.fail(
        `Error invoking AI model: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      process.exit(1);
    }
  });

export default invokeCommand;
