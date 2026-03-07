import { db, NotFoundError, InternalError, ForbiddenError, ValidationError } from '@hominem/db'
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

// Helper: Get chat with ownership verification
async function getChatWithOwnershipCheck(chatId: string, userId: string) {
  const chat = await db
    .selectFrom('chat')
    .selectAll()
    .where('id', '=', chatId)
    .where('user_id', '=', userId)
    .executeTakeFirst()

  if (!chat) {
    throw new ForbiddenError('Chat not found or access denied', 'ownership')
  }

  return chat
}

// Helper: Create or get active chat
async function getOrCreateActiveChat(userId: string, chatId?: string) {
  if (chatId) {
    const existingChat = await db
      .selectFrom('chat')
      .selectAll()
      .where('id', '=', chatId)
      .where('user_id', '=', userId)
      .executeTakeFirst()

    if (existingChat) {
      return existingChat
    }
  }

  // Create new chat
  const newChat = await db
    .insertInto('chat')
    .values({
      id: crypto.randomUUID(),
      title: 'New Chat',
      user_id: userId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return newChat
}

// Helper: Add message
async function addMessage(data: { chatId: string; userId: string; role: string; content: string }) {
  return await db
    .insertInto('chat_message')
    .values({
      id: crypto.randomUUID(),
      chat_id: data.chatId,
      user_id: data.userId,
      role: data.role,
      content: data.content,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

// Helper: Update message
async function updateMessage(data: { messageId: string; content: string; toolCalls?: any }) {
  return await db
    .updateTable('chat_message')
    .set({
      content: data.content,
      tool_calls: data.toolCalls ? JSON.stringify(data.toolCalls) : null,
      updated_at: new Date(),
    })
    .where('id', '=', data.messageId)
    .returningAll()
    .executeTakeFirst()
}

// Helper: Get chat messages
async function getChatMessages(chatId: string, options?: { limit?: number; offset?: number; orderBy?: 'asc' | 'desc' }) {
  let query = db.selectFrom('chat_message').selectAll().where('chat_id', '=', chatId)

  const orderDirection = options?.orderBy === 'asc' ? ('asc' as const) : ('desc' as const)
  query = query.orderBy('created_at', orderDirection)

  if (options && options.limit !== undefined && options.limit > 0) {
    query = query.limit(options.limit)
  }

  if (options && options.offset !== undefined && options.offset > 0) {
    query = query.offset(options.offset)
  }

  return query.execute()
}

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

    const [chatData, messagesData] = await Promise.all([
      getChatWithOwnershipCheck(chatId, userId),
      getChatMessages(chatId, { limit: 10, orderBy: 'desc' }),
    ])

    return c.json<ChatsGetOutput>({
      id: chatData.id,
      title: chatData.title,
      userId: chatData.user_id,
      noteId: chatData.note_id,
      createdAt: chatData.created_at,
      updatedAt: chatData.updated_at,
      messages: messagesData.reverse() as unknown as ChatMessage[],
    })
  })

  // Delete chat
  .delete('/', async (c) => {
    const chatId = c.req.param('id') as string
    const userId = c.get('userId')!

    // Verify ownership
    await getChatWithOwnershipCheck(chatId, userId)

    // Delete messages first (cascading is set, but explicit is safer)
    await db.deleteFrom('chat_message').where('chat_id', '=', chatId).execute()

    // Delete chat
    await db.deleteFrom('chat').where('id', '=', chatId).where('user_id', '=', userId).execute()

    return c.json({ success: true })
  })

  // Update chat title
  .patch('/', zValidator('json', chatsUpdateSchema), async (c) => {
    const chatId = c.req.param('id') as string
    const userId = c.get('userId')!
    const { title } = c.req.valid('json')

    // Verify ownership
    await getChatWithOwnershipCheck(chatId, userId)

    const updated = await db
      .updateTable('chat')
      .set({
        title,
        updated_at: new Date(),
      })
      .where('id', '=', chatId)
      .where('user_id', '=', userId)
      .executeTakeFirst()

    return c.json<ChatsUpdateOutput>({ success: !!updated })
  })

  // Send message with streaming
  .post('/send', zValidator('json', chatsSendSchema), async (c) => {
    const userId = c.get('userId')!
    const chatId = c.req.param('id') as string
    const { message } = c.req.valid('json')

    const currentChat = await getOrCreateActiveChat(userId, chatId)
    const startTime = Date.now()

    const historyMessages = await getChatMessages(currentChat.id, {
      limit: 20,
      orderBy: 'asc',
    })

    const userMessage = await addMessage({
      chatId: currentChat.id,
      userId,
      role: 'user',
      content: message,
    })

    const messagesWithNewUser: CoreMessage[] = [
      ...historyMessages.map((m) =>
        toCoreMessage({
          role: m.role,
          content: m.content as string,
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

    let assistantMessage = await addMessage({
      chatId: currentChat.id,
      userId: '',
      role: 'assistant',
      content: '',
    })

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

      const updatedAssistantMessage = await updateMessage({
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
      const updatedOnError = await updateMessage({
        messageId: assistantMessage.id,
        content: accumulatedContent || '[Error: Stream processing failed]',
      })
      if (updatedOnError) {
        assistantMessage = updatedOnError
      }
    }

    // Ensure both messages are non-null before returning
    if (!assistantMessage || !userMessage) {
      throw new InternalError('Failed to create or update message')
    }

    return c.json<ChatsSendOutput>({
      streamId: assistantMessage.id,
      chatId: currentChat.id,
      chatTitle: currentChat.title,
      messages: {
        user: userMessage as unknown as ChatMessage,
        assistant: assistantMessage as unknown as ChatMessage,
      },
      metadata: {
        startTime: startTime,
        timestamp: new Date().toISOString(),
      },
    } as ChatsSendOutput)
  })

  // AI SDK UI message endpoint for web/mobile useChat clients
  .post('/ui/send', zValidator('json', chatsUISendSchema), async (c) => {
    const userId = c.get('userId')!
    const routeChatId = c.req.param('id') as string
    const { messages } = c.req.valid('json')

    const currentChat = await getOrCreateActiveChat(userId, routeChatId)
    const latestUserMessage = [...messages]
      .reverse()
      .find((candidate) => candidate.role === 'user' && candidate.content.trim().length > 0)

    if (!latestUserMessage) {
      throw new ValidationError('messages must include at least one user message with content')
    }

    await addMessage({
      chatId: currentChat.id,
      userId,
      role: 'user',
      content: latestUserMessage.content,
    })

    const assistantMessage = await addMessage({
      chatId: currentChat.id,
      userId: '',
      role: 'assistant',
      content: '',
    })

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

        await updateMessage({
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

    const options: { limit?: number; offset?: number; orderBy: 'asc' } = {
      orderBy: 'asc',
    }
    if (limit) options.limit = Number.parseInt(limit)
    if (offset) options.offset = Number.parseInt(offset)

    const messagesData = await getChatMessages(chatId, options)
    return c.json<ChatsGetMessagesOutput>(messagesData as unknown as ChatMessage[])
  })

export const chatsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // Get user's chats
  .get('/', async (c) => {
    const userId = c.get('userId')!
    const limit = c.req.query('limit') ? Number.parseInt(c.req.query('limit')!) : 50

    const chatsData = await db
      .selectFrom('chat')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .execute()

    return c.json<ChatsListOutput>(chatsData as unknown as Chat[])
  })

  // Get or create chat for a note
  .get('/note/:noteId', async (c) => {
    const userId = c.get('userId')!
    const noteId = c.req.param('noteId')

    let chatData = await db
      .selectFrom('chat')
      .selectAll()
      .where('note_id', '=', noteId)
      .where('user_id', '=', userId)
      .executeTakeFirst()

    if (!chatData) {
      chatData = await db
        .insertInto('chat')
        .values({
          id: crypto.randomUUID(),
          title: 'Note Chat',
          user_id: userId,
          note_id: noteId,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    }

    return c.json<ChatsCreateOutput>(chatData as unknown as Chat)
  })

  // Create chat
  .post('/', zValidator('json', chatsCreateSchema), async (c) => {
    const userId = c.get('userId')!
    const { title, noteId } = c.req.valid('json')

    const result = await db
      .insertInto('chat')
      .values({
        id: crypto.randomUUID(),
        title,
        user_id: userId,
        note_id: noteId,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return c.json<ChatsCreateOutput>(result as unknown as Chat, 201)
  })

  // Search chats (simple text search on title and conversation context)
  .get('/search', async (c) => {
    const userId = c.get('userId')!
    const query = c.req.query('q')
    const limit = c.req.query('limit') ? Number.parseInt(c.req.query('limit')!) : 20

    if (!query) {
      throw new ValidationError('Query is required')
    }

    // Simple substring search on chat title
    const chatsData = await db
      .selectFrom('chat')
      .selectAll()
      .where('user_id', '=', userId)
      .where('title', 'like', `%${query}%`)
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .execute()

    return c.json({ chats: chatsData as unknown as Chat[] })
  })

  .route('/:id', chatByIdRoutes)
