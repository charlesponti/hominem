import { Command } from 'commander'
import { command as convertTypingMindToBolt } from './typingmind-to-bolt'
import { command as typingMindToOpenAICommand } from './typingmind-to-openai'

const convertCommand = new Command('convert')
  .description('Convert between different formats')
  .addCommand(typingMindToOpenAICommand)
  .addCommand(convertTypingMindToBolt)

export default convertCommand
