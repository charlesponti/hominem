import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { type nodeSchema, TypingMindExportSchema } from '@hominem/services/services'
import { Command } from 'commander'
import { consola } from 'consola'
import { z } from 'zod'

/**
 * Generate a random ID with the specified prefix
 */
function generateId(prefix = '') {
  return `${prefix}${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Convert a date string to a timestamp
 */
function dateToTimestamp(dateString: string) {
  return Math.floor(new Date(dateString).getTime() / 1000)
}

/**
 * Convert a Typing Mind export to OpenAI format
 */
export function convertTypingMindToOpenAI(typingMindData: z.infer<typeof TypingMindExportSchema>) {
  return typingMindData.data.chats.map((chat) => {
    // Create root node
    const rootId = generateId('root-')
    const mapping: Record<string, z.infer<typeof nodeSchema>> = {}

    // Add system message if it exists
    let lastNodeId = rootId
    let firstMessageNodeId: string | null = null
    let systemNodeId: string | null = null

    if (chat.chatParams?.systemMessage) {
      systemNodeId = generateId('system-')
      mapping[systemNodeId] = {
        id: systemNodeId,
        message: {
          channel: null,
          id: systemNodeId,
          author: {
            role: 'system',
            name: null,
            metadata: {},
          },
          create_time: dateToTimestamp(chat.createdAt),
          update_time: dateToTimestamp(chat.updatedAt),
          content: {
            content_type: 'text',
            parts: [chat.chatParams.systemMessage],
          },
          status: 'finished_successfully',
          end_turn: null,
          weight: 1,
          metadata: {},
          recipient: 'all',
        },
        parent: rootId,
        children: [], // Will be updated later if there are messages
      }

      lastNodeId = systemNodeId
    }

    // Process messages
    const messageNodes: string[] = []

    chat.messages.forEach((message, index) => {
      const role = message.role
      let contentText = ''

      // Process content based on type
      if (typeof message.content === 'string') {
        contentText = message.content
      } else if (Array.isArray(message.content)) {
        // Extract text content from array
        const textItems = message.content
          .filter((item) => item.type === 'text')
          .map((item) => item.text)
        contentText = textItems.join('\n')
      }

      const nodeId = generateId(`${role}-`)
      messageNodes.push(nodeId)

      // Store the first message node ID
      if (index === 0) {
        firstMessageNodeId = nodeId
      }

      mapping[nodeId] = {
        id: nodeId,
        message: {
          channel: null,
          id: nodeId,
          author: {
            role,
            name: null,
            metadata: {},
          },
          create_time: dateToTimestamp(chat.createdAt),
          update_time: dateToTimestamp(chat.updatedAt),
          content: {
            content_type: 'text',
            parts: [contentText],
          },
          status: 'finished_successfully',
          end_turn: role === 'assistant',
          weight: 1,
          metadata: {},
          recipient: 'all',
        },
        parent: lastNodeId,
        children: [], // Will be updated if there's a next message
      }

      // Update previous message's children to point to this message
      if (mapping[lastNodeId]) {
        mapping[lastNodeId].children = [nodeId]
      }

      lastNodeId = nodeId
    })

    // Create root node with appropriate children
    mapping[rootId] = {
      id: rootId,
      message: null,
      parent: null,
      children: systemNodeId ? [systemNodeId] : firstMessageNodeId ? [firstMessageNodeId] : [],
    }

    // If system node exists and there are messages, connect system to first message
    if (systemNodeId && firstMessageNodeId) {
      mapping[systemNodeId].children = [firstMessageNodeId]
    }

    // Create conversation object
    return {
      title: chat.chatTitle,
      create_time: dateToTimestamp(chat.createdAt),
      update_time: dateToTimestamp(chat.updatedAt),
      mapping,
      moderation_results: [],
      current_node: lastNodeId,
      plugin_ids: null,
      conversation_id: chat.chatID,
      conversation_template_id: null,
      gizmo_id: null,
      gizmo_type: null,
      is_archived: false,
      is_starred: null,
      safe_urls: [],
      default_model_slug: chat.model,
      conversation_origin: null,
      voice: null,
      async_status: null,
      disabled_tool_ids: [],
    }
  })
}

export const command = new Command('typingmind-to-openai')
  .description('Convert Typing Mind export to OpenAI format')
  .requiredOption('-i, --input <path>', 'Path to Typing Mind export JSON file')
  .option('-o, --output <path>', 'Path to save the OpenAI format JSON file', './openai-export.json')
  .action(async (options) => {
    try {
      consola.info(`Reading file: ${options.input}`)
      const data = JSON.parse(readFileSync(options.input, 'utf8'))

      // Validate input data
      const typingMindData = TypingMindExportSchema.parse(data)
      consola.info(
        `Successfully parsed Typing Mind data with ${typingMindData.data.chats.length} conversations`
      )

      // Convert data
      const openAIData = convertTypingMindToOpenAI(typingMindData)
      consola.info(`Converted ${openAIData.length} conversations to OpenAI format`)

      // Save output
      const outputPath = path.resolve(options.output)
      writeFileSync(outputPath, JSON.stringify(openAIData, null, 2))
      consola.info(`Saved OpenAI export to ${outputPath}`)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error in Typing Mind data:')
        console.error(error.errors)
      } else {
        console.error('Error converting data:', error)
      }
      process.exit(1)
    }
  })
