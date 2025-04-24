import { getAuthToken } from '@/utils/auth.utils'
import { logger } from '@/utils/logger'
import type { ChatMessageSelect } from '@hominem/utils/types'
import axios from 'axios'
import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'
import { writeFileSync } from 'node:fs'
import util from 'node:util'
import ora from 'ora'

export const invokeCommand = new Command()
  .name('invoke')
  .description('Interact with the AI assistant and invoke tools')
  .argument('<message>', 'Message to send')
  .option('-d, --debug', 'Show debug info')
  .option('--showToolResults', 'Show tool results', false)
  .option('-h, --host <host>', 'API host', 'localhost')
  .option('-p, --port <port>', 'API port', '4040')
  .action(async (message, options) => {
    const spinner = ora('Generating response').start()
    try {
      let token: ReturnType<typeof getAuthToken>

      try {
        token = getAuthToken()
      } catch (err) {
        spinner.fail('Not authenticated. Some features may be limited.')
        process.exit(1)
      }

      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const payload = { message }
      const url = `http://${options.host}:${options.port}/api/chat/generate`
      const response = await axios.post<{
        messages: ChatMessageSelect[]
      }>(url, payload, { headers })
      spinner.succeed(chalk.green('Response generated successfully'))

      const { messages } = response.data

      // Get the assistant message (should be only one with our updated service)
      const assistantMsg = messages.find((msg) => msg.role === 'assistant')

      if (!assistantMsg) {
        consola.log(chalk.red('No assistant message found in response'))
        process.exit(1)
      }

      const toolCalls = assistantMsg.toolCalls ?? []

      // Display the message content
      consola.log(chalk.blue.bold('assistant:'))
      consola.log(assistantMsg.content)
      consola.log('\n')

      // Summarize any tool calls succinctly
      if (toolCalls.length > 0) {
        consola.log(chalk.yellow.bold('tool calls:'))

        // Group tool calls by toolName for a more structured output
        const callsByToolName = new Map()

        for (const call of toolCalls) {
          if (call.type !== 'tool-call') continue

          // Group by tool name for better organization
          if (!callsByToolName.has(call.toolName)) {
            callsByToolName.set(call.toolName, [])
          }
          callsByToolName.get(call.toolName).push(call)
        }

        // Display each tool by name with their calls
        for (const [toolName, calls] of callsByToolName.entries()) {
          consola.log(chalk.cyan.bold(`  ${toolName}:`))

          for (const call of calls) {
            // Find the matching result if any
            const result = toolCalls.find(
              (tc) => tc.type === 'tool-result' && tc.toolCallId === call.toolCallId
            )

            // Format args
            const argsObj = call.args ?? {}
            consola.log(chalk.cyan('    args:'))
            for (const [key, value] of Object.entries(argsObj)) {
              consola.log(
                chalk.cyan(`      ${key}: ${util.inspect(value, { colors: true, depth: 1 })}`)
              )
            }

            // Format result
            if (result?.result && options.showToolResults) {
              const status = result.isError ? chalk.red('✗') : chalk.green('✓')
              consola.log(chalk.cyan(`    result: ${status}`))

              // Use util.inspect to format the result object nicely
              const formattedResult = util
                .inspect(result.result, {
                  colors: true,
                  depth: 2,
                  compact: false,
                })
                .split('\n')
                .map((line) => `      ${line}`)
                .join('\n')

              consola.log(formattedResult)
            } else {
              consola.log(chalk.cyan('    result: ') + chalk.yellow('(no result)'))
            }
            consola.log('\n') // Empty line between calls
          }
        }
      }

      // Detailed debug info when requested
      if (options.debug) {
        writeFileSync('debug.json', JSON.stringify(response.data, null, 2))
      }
    } catch (err) {
      logger.error('Error generating response:', err)
      spinner.fail('Failed to generate response')
      process.exit(1)
    }
  })
