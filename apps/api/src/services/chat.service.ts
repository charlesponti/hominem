import { openai } from '@ai-sdk/openai'
import { db, takeUniqueOrThrow } from '@ponti/utils/db'
import { chat, chatMessage } from '@ponti/utils/schema'
import { generateText, type ToolSet } from 'ai'
import { desc, eq } from 'drizzle-orm'
import logger from 'src/logger'

type GenerateTextResponse = Awaited<ReturnType<typeof generateText>>['response']
type AIModel = Parameters<typeof generateText>[0]['model']

interface ChatMessagesOptions {
  limit?: number
  offset?: number
  orderBy?: 'asc' | 'desc'
}

export class ChatService {
  getLastAssistantMessage(messages: GenerateTextResponse['messages']) {
    const lastMessage = messages.filter((msg) => msg.role === 'assistant').slice(-1)[0]
    if (Array.isArray(lastMessage.content)) {
      return lastMessage.content.map((part) => ('text' in part ? part.text : '')).join('')
    }
    return lastMessage.content as string
  }

  formatTextResponse<tools extends ToolSet>(
    response: Awaited<ReturnType<typeof generateText<tools>>>
  ) {
    return {
      toolCalls: response.toolCalls,
      messages: response.response.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }
  }

  async getChatById(chatId: string) {
    try {
      const chatData = await db
        .select()
        .from(chat)
        .where(eq(chat.id, chatId))
        .limit(1)
        .then(takeUniqueOrThrow)
        .catch(() => null)

      return chatData
    } catch (error) {
      logger.error('Error fetching chat by ID:', error)
      return null
    }
  }

  /**
   * Get or create an active chat for a user
   */
  async getOrCreateActiveChat(userId: string, chatId?: string) {
    try {
      if (chatId) {
        return await db
          .select()
          .from(chat)
          .where(eq(chat.id, chatId))
          .limit(1)
          .then(takeUniqueOrThrow)
          .catch(() => null)
      }

      const newChat = await db
        .insert(chat)
        .values({
          id: crypto.randomUUID(),
          title: 'Basic Chat',
          userId,
        })
        .returning()
        .then(takeUniqueOrThrow)

      return newChat
    } catch (error) {
      logger.error(error)
      return null
    }
  }

  /**
   * Get all messages for a chat with pagination options
   */
  async getChatMessages(chatId: string, options: ChatMessagesOptions = {}) {
    const { limit = 100, offset = 0, orderBy = 'asc' } = options

    const query = db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.chatId, chatId))
      .limit(limit)
      .offset(offset)

    if (orderBy === 'desc') {
      query.orderBy(desc(chatMessage.createdAt))
    } else {
      query.orderBy(chatMessage.createdAt)
    }

    return query
  }

  /**
   * Save a user message and AI response in a transaction
   */
  async saveConversation(userId: string, chatId: string, userMessage: string, aiResponse: string) {
    return db.transaction(async (t) => {
      return [
        // Insert user message
        await t
          .insert(chatMessage)
          .values({
            id: crypto.randomUUID(),
            userId,
            chatId,
            role: 'user',
            content: userMessage,
          })
          .returning()
          .then(takeUniqueOrThrow),
        // Insert assistant message
        await t
          .insert(chatMessage)
          .values({
            id: crypto.randomUUID(),
            userId,
            chatId,
            role: 'assistant',
            content: aiResponse,
          })
          .returning()
          .then(takeUniqueOrThrow),
      ]
    })
  }

  /**
   * Update chat title based on conversation
   */
  async updateChatTitle(chatId: string, messages: (typeof chatMessage.$inferSelect)[]) {
    // Only update if there are a few messages and the title is still default
    const currentChat = await db
      .select()
      .from(chat)
      .where(eq(chat.id, chatId))
      .limit(1)
      .then((rows) => rows[0])

    if (!currentChat || !currentChat.title.startsWith('Basic Chat')) {
      return currentChat
    }

    // Generate a more descriptive title
    try {
      const lastMessages = messages.slice(-3)
      if (lastMessages.length > 0) {
        const messageSummary = lastMessages.map((m) => m.content.slice(0, 30)).join(' ... ')
        const title =
          messageSummary.length > 50 ? `${messageSummary.slice(0, 47)}...` : messageSummary

        return await db
          .update(chat)
          .set({ title })
          .where(eq(chat.id, chatId))
          .returning()
          .then((rows) => rows[0])
      }
    } catch (error) {
      logger.error('Failed to update chat title', error)
    }

    return currentChat
  }

  /**
   * Get user's recent chats
   */
  async getUserChats(userId: string, limit = 10) {
    return db
      .select()
      .from(chat)
      .where(eq(chat.userId, userId))
      .orderBy(desc(chat.updatedAt))
      .limit(limit)
  }

  /**
   * Format chat message for prompts
   */
  formatMessage(message: { role: string; content: string }) {
    return `${message.role}: ${message.content}`
  }

  /**
   * Format Vercel chat messages for LLM context
   */
  formatVercelMessages(chatHistory: { role: string; content: string }[]) {
    const formattedDialogueTurns = chatHistory.map((message) => {
      if (message.role === 'user') {
        return `Human: ${message.content}`
      }

      if (message.role === 'assistant') {
        return `Assistant: ${message.content}`
      }

      return `${message.role}: ${message.content}`
    })

    return formattedDialogueTurns.join('\n')
  }

  /**
   * Convert database message array to AI SDK message format
   */
  formatMessagesForAI(messages: (typeof chatMessage.$inferSelect)[]) {
    return messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))
  }

  /**
   * Generate standalone question from followup with performance tracking
   */
  async generateStandaloneQuestion(
    chatHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    followupQuestion: string
  ): Promise<string> {
    const response = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.2,
      system:
        'Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.',
      messages: [
        {
          role: 'user',
          content: `Chat history:\n${this.formatVercelMessages(chatHistory)}\n\nFollow Up Input: ${followupQuestion}\nStandalone question:`,
        },
      ],
    })

    return response.response.messages[response.response.messages.length - 1].content as string
  }

  /**
   * Generate chat response with performance tracking
   */
  async generateChatResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    systemPrompt: string
  ) {
    return generateText({
      model: openai('gpt-4-turbo'),
      system: systemPrompt,
      messages,
    })
  }
}
