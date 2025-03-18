import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import {
  accept_list_invite,
  calculatorTool,
  chat as chatTool,
  create_bookmark,
  create_chat,
  create_finance_account,
  create_job_application,
  create_list,
  create_note,
  create_place,
  create_tasks,
  create_transaction,
  delete_bookmark,
  delete_chat,
  delete_finance_account,
  delete_health_activity,
  delete_job_application,
  delete_list,
  delete_note,
  delete_place,
  delete_transaction,
  edit_tasks,
  get_bookmarks,
  get_driving_directions,
  get_finance_accounts,
  get_health_activities,
  get_job_applications,
  get_lists,
  get_location_info,
  get_notes,
  get_places,
  get_transactions,
  get_user_profile,
  get_weather,
  invite_to_list,
  list_chats,
  log_health_activity,
  search_tasks,
  searchTool,
  update_bookmark,
  update_chat,
  update_finance_account,
  update_health_activity,
  update_job_application,
  update_list,
  update_note,
  update_place,
  update_transaction,
  update_user_profile,
} from '@ponti/ai'
import type { CoreMessage, Message as VercelChatMessage } from 'ai'
import { generateText, streamText, tool } from 'ai'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import logger from 'src/logger'
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
  show_intermediate_steps: z.boolean().optional(),
})

const chatMessagesSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
})

// Organize tools by category for better management
const userTools = {
  get_user_profile,
  update_user_profile,
}

const chatTools = {
  chatTool,
  create_chat,
  list_chats,
  update_chat,
  delete_chat,
}

const noteTools = {
  create_note,
  get_notes,
  update_note,
  delete_note,
}

const jobTools = {
  create_job_application,
  update_job_application,
  get_job_applications,
  delete_job_application,
}

const bookmarkTools = {
  create_bookmark,
  get_bookmarks,
  update_bookmark,
  delete_bookmark,
}

const listTools = {
  create_list,
  get_lists,
  update_list,
  delete_list,
  invite_to_list,
  accept_list_invite,
}

const placeTools = {
  create_place,
  get_places,
  update_place,
  delete_place,
  get_location_info,
  get_driving_directions,
  get_weather,
}

const healthTools = {
  log_health_activity,
  get_health_activities,
  update_health_activity,
  delete_health_activity,
}

const financeTools = {
  create_finance_account,
  get_finance_accounts,
  update_finance_account,
  delete_finance_account,
  create_transaction,
  get_transactions,
  update_transaction,
  delete_transaction,
}

const taskTools = {
  create_tasks,
  edit_tasks,
  search_tasks,
}

const utilityTools = {
  calculatorTool,
  searchTool,
}

// Combine all tools into one comprehensive toolset
const allTools = {
  ...userTools,
  ...chatTools,
  ...noteTools,
  ...jobTools,
  ...bookmarkTools,
  ...listTools,
  ...placeTools,
  ...healthTools,
  ...financeTools,
  ...taskTools,
  ...utilityTools,
}

// Use retrieval-agent endpoint with tools
const searchDocumentsTool = tool({
  parameters: z.object({ query: z.string() }),
  description: 'Search the database for information',
  execute: async ({ query }: { query: string }) => {
    return await HominemVectorStore.searchDocuments(query)
  },
})

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

      // Get last 20 messages
      const messages = await chatService.getChatMessages(activeChat.id, {
        limit: 20,
        orderBy: 'desc',
      })

      const sortedMessages = messages.sort(
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

      const { message, show_intermediate_steps } = data

      // Get chat history - with pagination for performance.
      // It is not likely more than 50 messages will be required to provide a valuable response.
      const messages = await chatService.getChatMessages(activeChat.id, { limit: 50 })

      // Create a performance timer
      const timer = performanceService.startTimer(`chat-${activeChat.id}`)
      timer.mark('routerStart')

      const showIntermediateSteps = show_intermediate_steps === true

      timer.mark('routerDecision')

      // Format the AI messages
      const aiMessages = chatService.formatMessagesForAI(messages)
      const fullMessages: CoreMessage[] = [...aiMessages, { role: 'user', content: message }]

      // Call model with tools and messages
      timer.mark('aiStart')
      const response = await generateText({
        model: openai('gpt-4o-mini'),
        temperature: 0.2,
        system: await promptService.getPrompt('assistant'),
        messages: fullMessages,
        tools: {
          search: searchDocumentsTool,
          ...allTools,
        },
        maxSteps: 5,
      })

      timer.mark('aiComplete')

      // Save the conversation to the database
      await chatService.saveConversation(
        userId,
        activeChat.id,
        message,
        chatService.getLastAssistantMessage(response.response.messages)
      )

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
      const documents = await HominemVectorStore.searchDocuments(queryForRetrieval)
      timer.mark('vectorSearchComplete')
      logger.debug(
        `Vector search took ${timer.getDurationBetween('vectorSearch', 'vectorSearchComplete')}s`
      )

      const documentsContent = documents.reduce((acc, doc) => `${acc}${doc.content}\n\n`, '')
      const serializedSources = Buffer.from(
        JSON.stringify(
          documents.map((doc) => ({
            pageContent: `${doc.content.slice(0, 50)}...`,
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
        model: openai('gpt-4o-mini'),
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
  fastify.post('/retrieval-agent', async (request, reply) => {
    try {
      const body = request.body as {
        messages: VercelChatMessage[]
        show_intermediate_steps: boolean
      }

      const messages = (body.messages ?? []).filter(
        (message: VercelChatMessage) => message.role === 'user' || message.role === 'assistant'
      )
      const returnIntermediateSteps = body.show_intermediate_steps
      const previousMessages = messages.slice(0, -1)
      const currentMessageContent = messages[messages.length - 1].content

      // Load the prompt
      const assistantPrompt = await promptService.getPrompt('assistant')

      // Create a custom tool for search
      const searchDocumentsTool = tool({
        parameters: z.object({ query: z.string() }),
        description: 'Search the database for information',
        execute: async ({ query }: { query: string }) => {
          return await HominemVectorStore.searchDocuments(query)
        },
      })

      const result = await generateText({
        model: openai('gpt-4o-mini'),
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
          search: searchDocumentsTool,
          ...allTools,
        },
        maxSteps: 5,
      })

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

  fastify.post('/agent', async (request, reply) => {
    try {
      const body = request.body as {
        messages: VercelChatMessage[]
        show_intermediate_steps: boolean
      }

      // Filter messages to include only user and assistant roles
      const messages = (body.messages ?? []).filter(
        (message: VercelChatMessage) => message.role === 'user' || message.role === 'assistant'
      )

      const response = await generateText({
        model: openai('gpt-4o-mini'),
        temperature: 0,
        system:
          "You are a helpful AI assistant called Hominem that can manage all aspects of a user's digital life. Use the appropriate tools to help the user accomplish their tasks.",
        messages,
        tools: allTools,
        maxSteps: 5,
      })

      return reply.status(200).send(chatService.formatTextResponse(response))
    } catch (error) {
      return handleError(error instanceof Error ? error : new Error(String(error)), reply)
    }
  })

  fastify.post('/assistant', async (request, reply) => {
    const { input } = request.body as { input: string }

    try {
      const { response, toolCalls } = await generateText({
        model: google('gemini-1.5-pro-latest'),
        tools: allTools,
        system:
          "You are a helpful assistant called Hominem that can manage all aspects of a user's digital life. Use the appropriate tools to help the user accomplish their tasks.",
        prompt: input,
        maxSteps: 5,
      })

      return reply.status(200).send({
        toolCalls,
        messages: response.messages.map((message) => ({
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
