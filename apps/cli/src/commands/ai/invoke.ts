import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'
import { writeFileSync } from 'node:fs'
import ora from 'ora'
import { trpc } from '../../lib/trpc'

export const invokeCommand = new Command()
  .name('invoke')
  .description('Interact with the AI assistant and invoke tools')
  .argument('<message>', 'Message to send')
  .option('-d, --debug', 'Show debug info')
  .option('--showToolResults', 'Show tool results', false)
  .action(async (message, options) => {
    const spinner = ora('Generating response').start()
    
    try {
      const response = await trpc.chat.generate.mutate({ message })

      // Stop spinner
      spinner.succeed(chalk.green('Success'))

      // Display the message content, if available
      if (response.response) {
        consola.log(`\n${chalk.blue.bold('assistant:')}\n${chalk.white(response.response)}\n`)
      }

      // Display tool calls if they exist
      if (response.toolCalls && response.toolCalls.length > 0) {
        consola.log(chalk.yellow.bold('Tool Calls:'))
        for (const toolCall of response.toolCalls) {
          consola.log(chalk.cyan(`- Tool: ${toolCall.toolName}`))
          consola.log(chalk.cyan(`  Args: ${JSON.stringify(toolCall.args, null, 2)}`))
        }
        consola.log('')
      }

      // Detailed debug info when requested
      if (options.debug) {
        writeFileSync('debug.json', JSON.stringify(response, null, 2))
      }
    } catch (err) {
      spinner.fail(`Error invoking AI model: ${err instanceof Error ? err.message : 'Unknown error'}`)
      process.exit(1)
    }
  })

export default invokeCommand
