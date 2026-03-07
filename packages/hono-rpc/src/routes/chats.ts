import crypto from 'node:crypto'

import { NotFoundError, InternalError, ForbiddenError, ValidationError } from '@hominem/db'
import {
  createChatQuery,
  getChatByIdQuery,
  getUserChatsQuery,
  getChatByNoteIdQuery,
  updateChatTitleQuery,
  deleteChatQuery,
  clearChatMessagesQuery,
  MessageService,
} from '@hominem/chat-services'
import { logger } from '@hominem/utils/logger'
import { zValidator } from '@hono/zod-validator'
import { convertToCoreMessages, streamText, type CoreMessage, type Message } from 'ai'
import { Hono } from 'hono'
import * as z from 'zod'

import { authMiddleware, type AppContext } from '../middleware/auth'
import {
  type Chat,
  type ChatMessage,
  type ChatsListOutput,
  type ChatsGetOutput,
  type ChatsCreateOutput,
  type ChatsUpdateOutput,
  type ChatsSendOutput,
  type ChatsGetMessagesOutput,
  chatsSendSchema,
  chatsUISendSchema,
} from '../types/chat.types'
import { toCoreMessage, typeToolsForAI } from '../utils/ai-adapters'
import { getOpenAIAdapter } from '../utils/llm'
import { getAvailableTools } from '../utils/tools'

const messageService = new MessageService()

const chatsCreateSchema = z.object({
  title: z.string().min(1),
  noteId: z.string().optional(),
})

const chatsUpdateSchema = z.object({
  title: z.string().min(1),
})

const chatsMessagesQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
})

const chatsSearchSchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional(),
})

const toPersistedToolCalls = (
  calls: Array<{ toolName: string; toolCallId: string; args: Record<string, unknown> }>,
) =>
  calls.map((toolCall) => ({
    toolName: toolCall.toolName,
    type: 'tool-call' as const,
    toolCallId: toolCall.toolCallId,
    args: toolCall.args as Record<string, string>,
  }))

/**
 * Sub-router for routes starting with /api/chats/:id
 */
const chatByIdRoutes = new Hono<AppContext>()
  // Get chat by ID
  .get('/', async (c) => {
    const chatId = c.req.param('id') as string
    const userId = c.get('userId')!

    const chatData = await getChatByIdQuery(chatId, userId)
    if (!chatData) {
      throw new ForbiddenError('Chat not found or access denied', 'ownership')
    }

    const messagesData = await messageService.getChatMessages(chatId, { limit: 10, orderBy: 'desc' })

    return c.json<ChatsGetOutput>({
      ...chatData,
      messages: messagesData.reverse(),
    })
  })

  // Delete chat
  .delete('/', async (c) => {
    const chatId = c.req.param('id') as string
    const userId = c.get('userId')!

    const success = await deleteChatQuery(chatId, userId)
    if (!success) {
      throw new ForbiddenError('Chat not found or access denied', 'ownership')
    }

    return c.json({ success: true })
  })

  // Update chat title
  .patch('/', zValidator('json', chatsUpdateSchema), async (c) => {
    const chatId = c.req.param('id') as string
    const userId = c.get('userId')!
    const { title } = c.req.valid('json')

    const updated = await updateChatTitleQuery(chatId, userId, title)
    if (!updated) {
      throw new ForbiddenError('Chat not found or access denied', 'ownership')
    }

    return c.json<ChatsUpdateOutput>({ success: true })
  })

  // Send message with streaming
  .post('/send', zValidator('json', chatsSendSchema), async (c) => {
    const userId = c.get('userId')!
    const chatId = c.req.param('id') as string
    const { message } = c.req.valid('json')

    // Get or verify chat exists
    let currentChat = await getChatByIdQuery(chatId, userId)
    if (!currentChat) {
      throw new ForbiddenError('Chat not found or access denied', 'ownership')
    }

    const startTime = Date.now()

    const historyMessages = await messageService.getChatMessages(currentChat.id, {
      limit: 20,
      orderBy: 'asc',
    })

    const userMessage = await messageService.addMessage({
      chatId: currentChat.id,
      userId,
      role: 'user',
      content: message,
    })

    if (!userMessage) {
      throw new InternalError('Failed to create user message')
    }

    const messagesWithNewUser: CoreMessage[] = [
      ...historyMessages.map((m) =>
        toCoreMessage({
          role: m.role,
          content: m.content,
        }),
      ),
      {
        role: 'user',
        content: message,
      },
    ]

    const adapter = getOpenAIAdapter()
    const { textStream, toolCalls } = await streamText({
      model: adapter,
      tools: typeToolsForAI(getAvailableTools(userId)),
      messages: messagesWithNewUser,
    })

    let assistantMessage = await messageService.addMessage({
      chatId: currentChat.id,
      userId: '',
      role: 'assistant',
      content: '',
    })

    if (!assistantMessage) {
      throw new InternalError('Failed to create assistant message')
    }

    let accumulatedContent = ''
    interface ToolCallEntry {
      toolName: string
      toolCallId: string
      args: Record<string, unknown>
    }
    const accumulatedToolCalls: ToolCallEntry[] = []

    try {
      // Collect stream results
      const textPromise = (async () => {
        for await (const chunk of textStream) {
          accumulatedContent += chunk
        }
      })()

      const toolsPromise = (async () => {
        const calls = await toolCalls
        for (const call of calls) {
          accumulatedToolCalls.push(call)
        }
      })()

      await Promise.all([textPromise, toolsPromise])

      const updatedAssistantMessage = await messageService.updateMessage({
        messageId: assistantMessage.id,
        content: accumulatedContent,
        toolCalls: accumulatedToolCalls.map((tc) => ({
          toolName: tc.toolName,
          type: 'tool-call',
          toolCallId: tc.toolCallId,
          args: tc.args as Record<string, string>,
        })),
      })
      if (updatedAssistantMessage) {
        assistantMessage = updatedAssistantMessage
      }
    } catch (streamError) {
      logger.error('[chats.send] Error consuming stream', { error: streamError })
      const updatedOnError = await messageService.updateMessage({
        messageId: assistantMessage.id,
        content: accumulatedContent || '[Error: Stream processing failed]',
      })
      if (updatedOnError) {
        assistantMessage = updatedOnError
      }
    }

    return c.json<ChatsSendOutput>({
      streamId: assistantMessage.id,
      chatId: currentChat.id,
      chatTitle: currentChat.title,
      messages: {
        user: userMessage,
        assistant: assistantMessage,
      },
      metadata: {
        startTime: startTime,
        timestamp: new Date().toISOString(),
      },
    })
  })

  // AI SDK UI message endpoint for web/mobile useChat clients
  .post('/ui/send', zValidator('json', chatsUISendSchema), async (c) => {
    const userId = c.get('userId')!
    const routeChatId = c.req.param('id') as string
    const { messages } = c.req.valid('json')

    let currentChat = await getChatByIdQuery(routeChatId, userId)
    if (!currentChat) {
      // Create a new chat if it doesn't exist
      currentChat = await createChatQuery({
        userId,
        title: 'New Chat',
      })
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((candidate) => candidate.role === 'user' && candidate.content.trim().length > 0)

    if (!latestUserMessage) {
      throw new ValidationError('messages must include at least one user message with content')
    }

    const userMessageResult = await messageService.addMessage({
      chatId: currentChat.id,
      userId,
      role: 'user',
      content: latestUserMessage.content,
    })

    if (!userMessageResult) {
      throw new InternalError('Failed to create user message')
    }

    const assistantMessage = await messageService.addMessage({
      chatId: currentChat.id,
      userId: '',
      role: 'assistant',
      content: '',
    })

    if (!assistantMessage) {
      throw new InternalError('Failed to create assistant message')
    }

    const assistantMessageId = assistantMessage.id
    const coreMessages = convertToCoreMessages(
      messages.map((message) => {
        const createdAt = message.createdAt ? new Date(message.createdAt) : undefined
        const sanitized: Message = {
          id: message.id,
          role: message.role,
          content: message.content,
          ...(createdAt ? { createdAt } : {}),
        }
        return sanitized
      }),
    )

    const result = streamText({
      model: getOpenAIAdapter(),
      tools: typeToolsForAI(getAvailableTools(userId)),
      messages: coreMessages,
      async onFinish(event) {
        const persistedToolCalls = toPersistedToolCalls(
          event.toolCalls.map((call) => ({
            toolName: call.toolName,
            toolCallId: call.toolCallId,
            args: call.args as Record<string, unknown>,
          })),
        )

        await messageService.updateMessage({
          messageId: assistantMessageId,
          content: event.text,
          toolCalls: persistedToolCalls.length > 0 ? persistedToolCalls : undefined,
        })
      },
    })

    return result.toDataStreamResponse()
  })

  // Get messages for a chat
  .get('/messages', zValidator('query', chatsMessagesQuerySchema), async (c) => {
    const chatId = c.req.param('id') as string
    const { limit, offset } = c.req.valid('query')

    const options = {
      orderBy: 'asc' as const,
      limit: limit ? Number.parseInt(limit) : undefined,
      offset: offset ? Number.parseInt(offset) : undefined,
    }

    const messagesData = await messageService.getChatMessages(chatId, options)
    return c.json<ChatsGetMessagesOutput>(messagesData)
  })

export const chatsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // Get user's chats
  .get('/', async (c) => {
    const userId = c.get('userId')!
    const limit = c.req.query('limit') ? Number.parseInt(c.req.query('limit')!) : 50

    const chatsData = await getUserChatsQuery(userId, limit)
    return c.json<ChatsListOutput>(chatsData)
  })

  // Get or create chat for a note
  .get('/note/:noteId', async (c) => {
    const userId = c.get('userId')!
    const noteId = c.req.param('noteId')

    let chatData = await getChatByNoteIdQuery(noteId, userId)
    if (!chatData) {
      chatData = await createChatQuery({
        userId,
        title: 'Note Chat',
        noteId,
      })
    }

    return c.json<ChatsCreateOutput>(chatData)
  })

  // Create chat
  .post('/', zValidator('json', chatsCreateSchema), async (c) => {
    const userId = c.get('userId')!
    const { title, noteId } = c.req.valid('json')

    const result = await createChatQuery({
      userId,
      title,
      ...(noteId && { noteId }),
    })

    return c.json<ChatsCreateOutput>(result, 201)
  })

  // Search chats (simple text search on title and conversation context)
  .get('/search', async (c) => {
    const userId = c.get('userId')!
    const query = c.req.query('q')
    const limit = c.req.query('limit') ? Number.parseInt(c.req.query('limit')!) : 20

    if (!query) {
      throw new ValidationError('Query is required')
    }

    // Get all user chats and filter locally (could optimize with DB full-text search later)
    const allChats = await getUserChatsQuery(userId, 1000)
    const filtered = allChats
      .filter((chat) => chat.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)

    return c.json({ chats: filtered })
  })

  .route('/:id', chatByIdRoutes)
