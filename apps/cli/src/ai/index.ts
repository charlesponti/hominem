import { openai } from '@ai-sdk/openai'
import { logger } from '@ponti/utils/logger'
import { generateText } from 'ai'
import { Command } from 'commander'

export const command = new Command()

command.name('ai')

command
  .command('tool-call')
  .description('AI tools')
  .requiredOption('-t, --text <text>', 'Text to analyze')
  .action(async (options) => {
    const response = await generateText({
      model: openai('gpt-4o-mini', { structuredOutputs: true }),
      prompt: `
        A taxi driver earns $9461 per 1-hour work.
        If he works 12 hours a day and in 1 hour he uses 14-liters petrol with price $134 for 1-liter.
        How much money does he earn in one day?
      `,
    })

    logger.info(`FINAL TOOL CALLS: ${JSON.stringify(response.toolCalls, null, 2)}`)
  })
