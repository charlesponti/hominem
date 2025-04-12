import { logger } from '@/utils/logger'
import { BoltExportSchema, TypingMindExportSchema } from '@hominem/utils/services'
import { Command } from 'commander'
import fs from 'node:fs'
import type { z } from 'zod'

export const command = new Command('convert-typingmind-to-bolt')
  .description('Convert TypingMind export to Bolt-AI format')
  .argument('<input>', 'Path to TypingMind export file')
  .option('-o, --output <output>', 'Output file path')
  .action(async (input, options) => {
    try {
      logger.info(`Reading file: ${input}`)
      const inputData = JSON.parse(fs.readFileSync(input, 'utf-8'))

      // Validate input against TypingMind schema
      const parsedInput = TypingMindExportSchema.parse(inputData)
      const { chats } = parsedInput.data

      // Convert each chat to Bolt format
      const boltConversations: z.infer<typeof BoltExportSchema>['chats'] = chats.map(
        (chat, index) => {
          // Generate a unique conversation ID
          const conversationId = index + 1

          // Convert messages
          const messages: z.infer<typeof BoltExportSchema>['chats'][number]['messages'] =
            chat.messages
              .filter((m) => m.role !== 'system')
              .map((message, msgIndex) => {
                // Handle content
                let content = ''
                if (typeof message.content === 'string') {
                  content = message.content
                } else if (Array.isArray(message.content)) {
                  // Concatenate text parts
                  content = message.content
                    .filter((item) => item.type === 'text')
                    .map((item) => (item.type === 'text' ? item.text : ''))
                    .filter(Boolean)
                    .join('\n')
                }

                // Convert timestamp
                const createdAt = message.createdAt
                  ? Math.floor(new Date(message.createdAt).getTime() / 1000)
                  : Math.floor(Date.now() / 1000) -
                    (chats.length - index) * 100000 -
                    msgIndex * 1000

                return {
                  isImage: false,
                  conversationId,
                  role: message.role,
                  content,
                  remoteImageURL: '',
                  model: message.model || chat.model || '',
                  provider: guessProvider(message.model || chat.model || ''),
                  createdAt,
                  imageURLs: [],
                  toolUseId: `toolu_${1000 + conversationId * 10 + msgIndex}`,
                }
              })
              .filter(Boolean)

          // Find system message for system instruction
          const systemMessage = chat.messages.find((m) => m.role === 'system')
          const systemInstruction =
            systemMessage && typeof systemMessage.content === 'string' ? systemMessage.content : ''

          // Convert chat params
          const chatParams = chat.chatParams || {}

          return {
            contextSince: -978307200, // Default value from Bolt sample
            messages,
            useWebBrowsing: false,
            isInline: false,
            model: chat.model || '',
            id: conversationId,
            tone: '',
            writingStyle: '',
            customModelId: getCustomModelId(chat.model || ''),
            format: '',
            archived: false,
            temperature: 1,
            systemInstruction,
            favorited: false,
            contextLimit: 10,
            title: chat.chatTitle || `Conversation ${conversationId}`,
            useWebSearch: false,
            frequencyPenalty: 0,
            languageCode: '',
            presencePenalty: 0,
            plugins: [],
          }
        }
      )

      // Create full Bolt export structure
      const boltExport = {
        chats: boltConversations,
        assistants: [
          {
            model: 'gpt-4',
            customModelId: 0,
            enable: true,
            icon: '',
            temperature: 1,
            displayId: 'default_assistant',
            name: 'Default Assistant',
            instruction: '',
            sortOrder: 0,
            frequencyPenalty: 0,
            languageCode: 'en-us',
            presencePenalty: 0,
            label: 'Default Assistant',
          },
        ],
        folders: [
          {
            name: 'imported',
            id: 1,
          },
        ],
        version: 3,
        preferences: {
          setappAIPlan: 'free',
          autoCollapseLongPrompt: true,
          hideDockIcon: false,
          networkTimeoutInterval: 600,
          showSuggestedPrompt: true,
          showCost: true,
          autoGenerateTitle: true,
          defaultContextLimit: 10,
          useMarkdown: true,
        },
        commands: [],
        memories: [],
        services: [
          {
            contextLength: 0,
            apiKey: '',
            id: 0,
            name: 'OpenAI',
            useStream: true,
            modelId: 'gpt-4',
            provider: 'OpenAI',
            apiEndpoint: 'api.openai.com',
          },
        ],
        prompts: [],
      }

      // Validate against Bolt schema
      BoltExportSchema.parse(boltExport)

      // Write output
      const outputPath = options.output || input.replace(/\.json$/, '-bolt.json')
      fs.writeFileSync(outputPath, JSON.stringify(boltExport, null, 2))
      logger.info(`Successfully converted to Bolt format: ${outputPath}`)
    } catch (error) {
      logger.error('Error converting file:', error)
      if (error instanceof Error) {
        logger.error(error.message)
      }
      process.exit(1)
    }
  })

// Helper function to guess provider based on model name
export function guessProvider(model: string): string {
  if (!model) return 'Unknown'

  const modelLower = model.toLowerCase()
  if (
    modelLower.includes('gpt') ||
    modelLower.includes('davinci') ||
    modelLower.includes('text-embedding')
  ) {
    return 'OpenAI'
  }
  if (modelLower.includes('claude')) {
    return 'AnthropicAI'
  }

  if (modelLower.includes('gemini') || modelLower.includes('palm')) {
    return 'GoogleAI'
  }

  if (modelLower.includes('llama') || modelLower.includes('mistral')) {
    return 'Meta'
  }

  if (modelLower.includes('dall-e')) {
    return 'OpenAI'
  }

  return 'Unknown'
}

// Helper function to assign custom model IDs based on model name
export function getCustomModelId(model: string): number {
  if (!model) return 0

  const modelLower = model.toLowerCase()
  if (modelLower.includes('gpt-4')) {
    return 3
  }

  if (modelLower.includes('claude')) {
    return 2
  }

  if (modelLower.includes('gemini')) {
    return 1
  }

  return 0
}
