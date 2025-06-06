// import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { logger } from '@hominem/utils/logger'
import { allTools } from '@hominem/utils/tools'
import { generateText, streamText } from 'ai'
import type { FastifyInstance } from 'fastify'
import z from 'zod'
import { ApiError, handleError } from '../lib/errors.js'
import { verifyAuth } from '../middleware/auth.js'
import { redisCache } from '../plugins/redis.js'
import { ChatService } from '../services/chat.service.js'
import { getPerformanceService } from '../services/performance.service.js'
import { promptService } from '../services/prompt.service.js'
import { HominemVectorStore } from '../services/vector.service.js'

// const model = google('gemini-1.5-pro-latest')
const model = openai('gpt-4o')

// Schema for chat requests
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  type: z.enum(['stream', 'agent']).default('agent'),
  showDebugInfo: z.boolean().optional(),
})

// Schema for generate requests
const generateRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
})

// Schema for history query parameters
const historyQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = Number.parseInt(val || '', 10)
      return Number.isNaN(parsed) ? 20 : Math.min(Math.max(parsed, 1), 100)
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = Number.parseInt(val || '', 10)
      return Number.isNaN(parsed) ? 0 : Math.max(parsed, 0)
    }),
})

// Define utility tools
const utilityTools = {
  calculatorTool: allTools.calculatorTool,
}

export async function chatPlugin(fastify: FastifyInstance) {
  const chatService = new ChatService()
  const performanceService = getPerformanceService()

  // Add lifecycle hooks
  fastify.addHook('onRequest', async (request) => {
    request.log.debug(`Processing chat request: ${request.url}`)
  })

  fastify.addHook('onResponse', async (request, reply) => {
    request.log.debug(`Chat request completed in ${reply.elapsedTime}ms`)
  })

  // Base chat endpoint - returns active chat info
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const activeChatId = request.cookies.activeChat
      const chat = await chatService.getOrCreateActiveChat(userId, activeChatId, async (chatId) => {
        // Remove chatId from cookies if it doesn't exist
        reply.clearCookie('activeChat')
      })

      if (!chat) {
        return reply.code(500).send({ error: 'Failed to get or create chat' })
      }

      // Set cookie for new chats
      reply.setCookie('activeChat', chat.id)

      // Get last 20 messages with processed tool calls and results
      const history = await chatService.getConversationWithToolCalls(chat.id, {
        limit: 20,
        orderBy: 'desc',
      })

      // Sort messages by creation time
      const sortedMessages = history.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      return reply.send({
        success: true,
        chatId: chat.id,
        messages: sortedMessages,
      })
    } catch (error) {
      logger.error(error)
      return handleError(error instanceof Error ? error : new Error(String(error)), reply)
    }
  })

  // Get complete conversation history with tool calls
  fastify.get('/history/:chatId', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { chatId } = request.params as { chatId: string }
    if (!chatId) {
      return reply.code(400).send({ error: 'Chat ID is required' })
    }

    try {
      // Get the chat to verify ownership
      const chatData = await chatService.getChatById(chatId)
      if (!chatData) {
        return reply.code(404).send({ error: 'Chat not found' })
      }

      if (chatData.userId !== userId) {
        return reply.code(403).send({ error: 'Not authorized to access this chat' })
      }

      // Parse and validate pagination params using Zod schema
      const { success, data, error } = historyQuerySchema.safeParse(request.query)
      if (!success) {
        return reply.code(400).send({
          error: 'Invalid query parameters',
          errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        })
      }

      const { limit, offset } = data

      // Fetch one page of messages in descending order (newest first)
      const historyPage = await chatService.getConversationWithToolCalls(chatId, {
        limit,
        offset,
        orderBy: 'desc',
      })
      // Return in chronological order for client
      const messages = historyPage.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      const hasMore = historyPage.length === limit
      return reply.send({
        chatId,
        messages,
        hasMore,
      })
    } catch (error) {
      logger.error(error)
      return handleError(error instanceof Error ? error : new Error(String(error)), reply)
    }
  })

  // New Chat endpoint
  fastify.post('/new', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      // Create a new chat
      const newChat = await chatService.getOrCreateActiveChat(userId)

      if (!newChat) {
        return reply.code(500).send({ error: 'Failed to create new chat' })
      }

      // Set cookie for the new chat
      reply.setCookie('activeChat', newChat.id)

      return reply.send({
        success: true,
        chatId: newChat.id,
      })
    } catch (error) {
      logger.error(error)
      return handleError(error instanceof Error ? error : new Error(String(error)), reply)
    }
  })

  // Main chat endpoint - handles both streaming and agent-based responses
  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const activeChatId = request.cookies.activeChat
      const activeChat = await chatService.getOrCreateActiveChat(userId, activeChatId)

      if (!activeChat) {
        return reply.code(404).send({ error: 'Chat not found' })
      }

      // Set cookie for new chats
      if (!activeChatId) {
        reply.setCookie('activeChat', activeChat.id)
      }

      // Parse request body based on schema
      const { success, data, error } = chatRequestSchema.safeParse(request.body)
      if (!success) {
        return reply.code(400).send({ errors: error.errors.map((e) => e.path).join(', ') })
      }

      const { message, type = 'agent', showDebugInfo } = data

      // Get chat history for context
      const history = await chatService.getChatMessages(activeChat.id, {
        limit: 20,
        orderBy: 'desc',
      })

      // Format messages for AI
      const previousMessages = chatService.formatMessagesForAI(history)

      // Create performance timer
      const timer = performanceService.startTimer(`chat-${activeChat.id}`)
      timer.mark('routerStart')

      // Handle streaming response type
      if (type === 'stream') {
        // Check if we need to reformulate the query for retrieval
        let queryForRetrieval = message
        const cacheKey = `query-${Buffer.from(message).toString('base64').slice(0, 32)}`

        if (previousMessages.length > 0) {
          const cachedQuery = await redisCache.get(fastify.redis, cacheKey)
          if (cachedQuery) {
            queryForRetrieval = cachedQuery
          } else {
            timer.mark('questionReformulation')
            queryForRetrieval = await chatService.generateStandaloneQuestion(
              previousMessages,
              message
            )
            timer.mark('questionReformulated')
            await redisCache.set(fastify.redis, cacheKey, queryForRetrieval, 60 * 5)
          }
        }

        // Search documents
        timer.mark('vectorSearch')
        const { results } = await HominemVectorStore.searchDocuments(queryForRetrieval)
        timer.mark('vectorSearchComplete')

        const documentsContent = results.reduce((acc, doc) => `${acc}${doc.document}\n\n`, '')
        const serializedSources = Buffer.from(
          JSON.stringify(
            results.map((doc) => ({
              pageContent: `${doc.document.slice(0, 50)}...`,
              metadata: doc.metadata,
            }))
          )
        ).toString('base64')

        // Set up response headers
        reply.headers({
          'x-message-index': (previousMessages.length + 1).toString(),
          'x-sources': serializedSources,
          'content-type': 'text/plain; charset=utf-8',
        })

        // Create and return stream
        const stream = streamText({
          model,
          temperature: 0.2,
          system: `You are a helpful AI assistant named Hominem.
            
            Answer the question based only on the following context and chat history:
            <context>
              ${documentsContent}
            </context>
            
            <chat_history>
              ${chatService.formatVercelMessages(previousMessages)}
            </chat_history>`,
          messages: [{ role: 'user', content: queryForRetrieval }],
        })

        return reply.send(stream)
      }

      // Handle agent-based response type
      timer.mark('ai-start')
      const result = await generateText({
        model,
        temperature: 0.2,
        system: await promptService.getPrompt('assistant', {
          userId,
          currentDate: new Date().toISOString(),
        }),
        messages: [...previousMessages, { role: 'user', content: message }],
        tools: {
          search: HominemVectorStore.searchDocumentsTool,
          ...allTools,
          ...utilityTools,
        },
        maxSteps: 5,
      })
      timer.mark('ai-complete')

      // Save conversation
      await chatService.saveCompleteConversation(userId, activeChat.id, message, result)
      timer.mark('conversation-saved')
      timer.stop()

      // Format response
      return reply.send({
        messages: result.response.messages,
        ...(showDebugInfo
          ? {
              steps: result.toolCalls,
              results: result.toolResults,
            }
          : {}),
      })
    } catch (error) {
      logger.error(error)
      return handleError(
        error instanceof Error ? error : new ApiError(500, 'Error processing chat request'),
        reply
      )
    }
  })

  // Generate endpoint - handles single-turn generation with tools
  fastify.post('/generate', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      // Parse request body based on schema
      const { success, data, error } = generateRequestSchema.safeParse(request.body)
      if (!success) {
        return reply.code(400).send({ errors: error.errors.map((e) => e.path).join(', ') })
      }

      const { message } = data

      // Create performance timer
      const timer = performanceService.startTimer(`generate-${userId}-${Date.now()}`)
      timer.mark('generate-start')

      // Handle agent-based response type
      const result = await generateText({
        model,
        temperature: 0.2,
        system: await promptService.getPrompt('assistant', {
          userId,
          currentDate: new Date().toISOString(),
        }),
        messages: [{ role: 'user', content: message }],
        tools: {
          search: HominemVectorStore.searchDocumentsTool,
          ...allTools,
          ...utilityTools,
          calculate_transactions: allTools.calculate_transactions,
        },
        maxSteps: 5,
      })
      timer.mark('generate-complete')
      timer.stop()

      // Generate ChatMessageSelect array using service helper
      const chatMessages = chatService.generateChatMessagesFromResponse(result, userId)
      return reply.send({
        messages: chatMessages,
      })
    } catch (error) {
      console.error('Error in generate endpoint:', error)
      logger.error(error)
      return handleError(
        error instanceof Error ? error : new ApiError(500, 'Error processing generate request'),
        reply
      )
    }
  })

  // Delete/clear all messages in a chat
  fastify.delete('/:chatId/messages', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { chatId } = request.params as { chatId: string }
    if (!chatId) {
      return reply.code(400).send({ error: 'Chat ID is required' })
    }

    try {
      // Get the chat to verify ownership
      const chatData = await chatService.getChatById(chatId)
      if (!chatData) {
        return reply.code(404).send({ error: 'Chat not found' })
      }

      if (chatData.userId !== userId) {
        return reply.code(403).send({ error: 'Not authorized to access this chat' })
      }

      // Clear all messages for this chat
      await chatService.clearChatMessages(chatId)

      return reply.send({
        success: true,
        message: 'Chat messages cleared successfully',
      })
    } catch (error) {
      logger.error(error)
      return handleError(error instanceof Error ? error : new Error(String(error)), reply)
    }
  })
}
