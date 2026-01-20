import { generateText } from 'ai';
import chalk from 'chalk';
import { Command } from 'commander';
import { consola } from 'consola';
import ora from 'ora';

import { lmstudio } from '@/utils/lmstudio';

export const askCommand = new Command()
  .command('ask')
  .description('get answer to a question')
  .argument('<question>', 'The question the LLM should answer.')
  .option('-t, --show-thinking', 'Show the LLM thinking process')
  .action(async (question, options) => {
    const spinner = ora(`Asking: ${chalk.blue(question)}`).start();

    const response = await generateText({
      model: lmstudio('qwen3-14b'),
      prompt: `
        You are a multi-disciplinary expert with a deep understanding of various fields.
        You are capable of providing concise and accurate answers to a wide range of questions.
        Provide a concise answer to user's question.
        If the user does not provide a question, nudge them to ask one based on what they've provided.
        
        **User question:** \n${question}
      `,
    });

    spinner.succeed(chalk.green('Answer received successfully'));
    const [thinking, answer] = response.text.split('</think>');
    consola.log(`${chalk.bold.blue('Question:')} ${chalk.cyan(question)}`);

    let responseText = '\n';

    if (options.showThinking) {
      responseText += `${chalk.bold.green('thinking:')} ${chalk.white(thinking.replace(/<think>/g, '').trim())}\n\n`;
    }

    responseText += `${chalk.bold.blue('Answer:')} ${chalk.white(answer.trim())}`;

    consola.log(responseText);
  });
