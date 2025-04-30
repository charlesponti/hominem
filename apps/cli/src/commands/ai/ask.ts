import { lmstudio } from '@/utils/lmstudio'
import { generateText } from 'ai'
import chalk from 'chalk'
import { Command } from 'commander'

export const askCommand = new Command()
  .command('ask')
  .description('get answer to a question')
  .argument('<question>', 'The question the LLM should answer.')
  .action(async (question) => {
    const response = await generateText({
      model: lmstudio('gemma-3-12b-it'),
      prompt: `
        You are a multi-disciplinary expert with a deep understanding of various fields.
        You are capable of providing concise and accurate answers to a wide range of questions.
        Provide a concise answer to user's question.
        If the user does not provide a question, nudge them to ask one based on what they've provided.
        
        **User question:** \n${question}
      `,
    })

    console.info(chalk.bold.blue('Question:'))
    console.info(chalk.cyan(question))
    console.info(chalk.bold.green('Answer:'))
    console.info(chalk.white(response.text))
  })
