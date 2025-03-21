import { google } from '@ai-sdk/google'
import { allTools, calculatorTool, searchTool } from '@ponti/ai'
import logger from '@ponti/utils/logger'
import type { CoreMessage, Message as VercelChatMessage } from 'ai'
import { generateText, streamText } from 'ai'
import type { FastifyInstance } from 'fastify'
import { verifyAuth } from 'src/middleware/auth'
import { ChatService } from 'src/services/chat.service'
import { getPerformanceService } from 'src/services/performance.service'
import { promptService } from 'src/services/prompt.service'
import { HominemVectorStore } from 'src/services/vector.service'
import { ApiError, BadRequestError, handleError } from 'src/utils/errors'
import z from 'zod'
import { redisCache } from '../redis'

const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  showDebugInfo: z.boolean().optional(),
})

const chatMessagesSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      toolCalls: z.any().optional(),
      toolResults: z.any().optional(),
      parentMessageId: z.string().uuid().optional(),
      messageIndex: z.string().optional(),
    })
  ),
})

// Define any utility tools that aren't part of the imported collections
const utilityTools = {
  calculatorTool,
  searchTool,
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

  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const activeChatId = request.cookies.activeChat
    if (!activeChatId) {
      return reply.code(400).send({ error: 'No active chat found' })
    }

    try {
      // Get the active chat
      const activeChat = await chatService.getChatById(activeChatId)
      if (!activeChat) {
        return reply.code(404).send({ error: 'Chat not found' })
      }

      // Get last 20 messages with processed tool calls and results
      const history = await chatService.getConversationWithToolCalls(activeChat.id, {
        limit: 20,
        orderBy: 'desc',
      })

      // Sort by creation time
      const sortedMessages = history.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      return reply.send({
        success: true,
        chatId: activeChat.id,
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

      // Get the complete conversation history with tool calls
      const history = await chatService.getConversationWithToolCalls(chatId)

      return reply.send({
        chatId,
        messages: history,
      })
    } catch (error) {
      logger.error(error)
      return handleError(error instanceof Error ? error : new Error(String(error)), reply)
    }
  })

  // Get nested conversation history organized in a tree structure
  fastify.get('/nested-history/:chatId', { preHandler: verifyAuth }, async (request, reply) => {
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

      // Get the nested conversation history
      const nestedHistory = await chatService.getNestedConversation(chatId, {
        limit: 100,
        orderBy: 'asc',
      })

      return reply.send({
        success: true,
        chatId,
        messages: nestedHistory,
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

      const { success, data, error } = chatMessageSchema.safeParse(request.body)
      if (!success) {
        return reply.code(400).send({ errors: error.errors.map((e) => e.path).join(', ') })
      }

      const { message, showDebugInfo } = data

      // Get chat history - with pagination for performance.
      // It is not likely more than 50 messages will be required to provide a valuable response.
      const messages = await chatService.getChatMessages(activeChat.id, { limit: 50 })

      // Create a performance timer
      const timer = performanceService.startTimer(`chat-${activeChat.id}`)
      timer.mark('routerStart')

      // Format the AI messages
      const aiMessages = chatService.formatMessagesForAI(messages)
      const fullMessages: CoreMessage[] = [...aiMessages, { role: 'user', content: message }]

      // Call model with tools and messages
      timer.mark('ai-start')
      const response = await generateText({
        model: google('gemini-1.5-flash-latest'),
        temperature: 0.2,
        system: await promptService.getPrompt('assistant'),
        messages: fullMessages,
        tools: {
          search: HominemVectorStore.searchDocumentsTool,
          ...allTools,
          ...utilityTools,
        },
        maxSteps: 5,
      })

      timer.mark('ai-complete')

      // Save the complete conversation with tool calls to the database
      await chatService.saveCompleteConversation(userId, activeChat.id, message, response)

      timer.mark('conversation-saved')
      timer.stop()

      // Format the response with route type for debugging if needed
      const formattedResponse = chatService.formatTextResponse(response)

      return reply.send(formattedResponse)
    } catch (error) {
      logger.error(error)
      return handleError(error instanceof Error ? error : new Error(String(error)), reply)
    }
  })

  /**
   * Standard retrieval route
   */
  fastify.post('/retrieval', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { success, data, error } = chatMessagesSchema.safeParse(request.body)
      if (!success) {
        throw BadRequestError(error.errors.map((e) => e.message).join(', '))
      }

      const { messages } = data

      // Create performance timer
      const timer = performanceService.startTimer('retrieval')

      const previousMessages = messages.slice(0, -1)
      const currentMessageContent = messages[messages.length - 1].content

      // Add caching for similar queries using Redis directly
      const cacheKey = `query-${Buffer.from(currentMessageContent).toString('base64').slice(0, 32)}`
      const cachedQuery = await redisCache.get(fastify.redis, cacheKey)

      // First, get a standalone question if this is a follow-up
      let queryForRetrieval = currentMessageContent

      if (!cachedQuery && previousMessages.length > 0) {
        timer.mark('questionReformulation')

        // Use the decorated method for generation
        queryForRetrieval = await chatService.generateStandaloneQuestion(
          previousMessages,
          currentMessageContent
        )

        timer.mark('questionReformulated')

        // Cache the reformulated query using Redis
        await redisCache.set(fastify.redis, cacheKey, queryForRetrieval, 60 * 5) // 5 minutes
      } else if (cachedQuery) {
        queryForRetrieval = cachedQuery
        logger.debug('Using cached query reformulation from Redis')
      }

      // Search documents using the standalone question
      timer.mark('vectorSearch')
      const { results } = await HominemVectorStore.searchDocuments(queryForRetrieval)
      timer.mark('vectorSearchComplete')
      logger.debug(
        `Vector search took ${timer.getDurationBetween('vectorSearch', 'vectorSearchComplete')}s`
      )

      const documentsContent = results.reduce((acc, doc) => `${acc}${doc.document}\n\n`, '')
      const serializedSources = Buffer.from(
        JSON.stringify(
          results.map((doc) => ({
            pageContent: `${doc.document.slice(0, 50)}...`,
            metadata: doc.metadata,
          }))
        )
      ).toString('base64')

      // Set up response headers before starting the stream
      reply.headers({
        'x-message-index': (previousMessages.length + 1).toString(),
        'x-sources': serializedSources,
        'content-type': 'text/plain; charset=utf-8',
      })

      const stream = streamText({
        model: google('gemini-1.5-flash-latest'),
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

      // Return the stream directly
      return reply.send(stream)
    } catch (error) {
      logger.error(error)
      return handleError(
        error instanceof Error
          ? error
          : new ApiError(500, 'Error retrieving information from the database'),
        reply
      )
    }
  })

  /**
   * Agent-based retrieval route
   */
  fastify.post('/retrieval-agent', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const body = request.body as {
        messages: VercelChatMessage[]
        showDebugInfo: boolean
      }

      const messages = (body.messages ?? []).filter(
        (message: VercelChatMessage) => message.role === 'user' || message.role === 'assistant'
      )
      const returnIntermediateSteps = body.showDebugInfo
      const previousMessages = messages.slice(0, -1)
      const currentMessageContent = messages[messages.length - 1].content

      // Load the prompt
      const assistantPrompt = await promptService.getPrompt('assistant')

      const result = await generateText({
        model: google('gemini-1.5-flash-latest'),
        temperature: 0.2,
        system: assistantPrompt,
        messages: [
          ...previousMessages.map((msg) => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
          })),
          { role: 'user', content: currentMessageContent },
        ],
        tools: {
          search: HominemVectorStore.searchDocumentsTool,
          ...allTools,
          ...utilityTools,
        },
        maxSteps: 5,
      })

      // Save the complete conversation with tool calls to the database
      if (request.userId) {
        const activeChatId = request.cookies.activeChat
        if (activeChatId) {
          try {
            await chatService.saveCompleteConversation(
              request.userId,
              activeChatId,
              currentMessageContent,
              result
            )
          } catch (error) {
            logger.error('Failed to save conversation:', error)
          }
        }
      }

      return reply.status(200).send({
        messages: result.response.messages,
        ...(returnIntermediateSteps
          ? {
              steps: result.toolCalls,
              results: result.toolResults,
            }
          : {}),
      })
    } catch (error) {
      logger.error(error)
      return handleError(
        error instanceof Error
          ? error
          : new ApiError(500, 'Error retrieving information from the database'),
        reply
      )
    }
  })

  fastify.post('/agent', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const body = request.body as {
        messages: VercelChatMessage[]
        showDebugInfo: boolean
      }

      // Filter messages to include only user and assistant roles
      const messages = (body.messages ?? []).filter(
        (message: VercelChatMessage) => message.role === 'user' || message.role === 'assistant'
      )

      const response = await generateText({
        model: google('gemini-1.5-flash-latest'),
        temperature: 0,
        system:
          "You are a helpful AI assistant called Hominem that can manage all aspects of a user's digital life. Use the appropriate tools to help the user accomplish their tasks.",
        messages,
        tools: {
          ...allTools,
          ...utilityTools,
        },
        maxSteps: 5,
      })

      // Save the complete conversation with tool calls to the database
      if (request.userId) {
        const activeChatId = request.cookies.activeChat
        if (activeChatId) {
          try {
            const currentMessageContent = messages[messages.length - 1].content
            await chatService.saveCompleteConversation(
              request.userId,
              activeChatId,
              currentMessageContent,
              response
            )
          } catch (error) {
            logger.error('Failed to save conversation:', error)
          }
        }
      }

      return reply.status(200).send(chatService.formatTextResponse(response))
    } catch (error) {
      return handleError(error instanceof Error ? error : new Error(String(error)), reply)
    }
  })

  fastify.post('/assistant', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { input } = request.body as { input: string }

    try {
      const result = await generateText({
        model: google('gemini-1.5-pro-latest'),
        tools: {
          ...allTools,
          ...utilityTools,
        },
        system:
          "You are a helpful assistant called Hominem that can manage all aspects of a user's digital life. Use the appropriate tools to help the user accomplish their tasks.",
        prompt: input,
        maxSteps: 5,
      })

      // Save the complete conversation with tool calls to the database
      const activeChatId = request.cookies.activeChat
      if (activeChatId) {
        try {
          await chatService.saveCompleteConversation(userId, activeChatId, input, result)
        } catch (error) {
          logger.error('Failed to save conversation:', error)
        }
      }

      return reply.status(200).send({
        toolCalls: result.toolCalls,
        messages: result.response.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      })
    } catch (error) {
      logger.error(error)
      return handleError(
        error instanceof Error
          ? error
          : new ApiError(500, 'An error occurred while processing your request.'),
        reply
      )
    }
  })
}
