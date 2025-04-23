import { openai } from '@ai-sdk/openai'
import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { logger } from '@hominem/utils/logger'
import { chat, chatMessage } from '@hominem/utils/schema'
import type { ChatMessageSelect } from '@hominem/utils/types'
import { generateText, type GenerateTextResult, type ToolSet } from 'ai'
import { desc, eq } from 'drizzle-orm'

type GenerateTextResponse = Awaited<ReturnType<typeof generateText>>['response']

interface ChatMessagesOptions {
  limit?: number
  offset?: number
  orderBy?: 'asc' | 'desc'
}

export class ChatService {
  /**
   * Process and merge tool calls with their results from the response steps
   */
  mergeToolCallsAndResults<T extends ToolSet>(response: GenerateTextResult<T, unknown>) {
    // Define type for the merged tool call records
    type MergedToolCall = {
      type: 'tool-call' | 'tool-result'
      toolCallId: string
      toolName: string
      args?: Record<string, unknown>
      result?: unknown
      isError?: boolean
    }

    // Extract all toolCalls and toolResults from the response steps
    const toolCallsMap = new Map<string, MergedToolCall>()

    // Process each step in the response to gather all tool calls and results
    for (const step of response.steps || []) {
      // Add tool calls from this step
      for (const call of step.toolCalls) {
        toolCallsMap.set(call.toolCallId, {
          type: 'tool-call',
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          args: call.args || {},
        })
      }

      // Add tool results from this step
      for (const result of step.toolResults) {
        const existingCall = toolCallsMap.get(result.toolCallId)

        if (existingCall) {
          // Merge result with existing call
          existingCall.result = result.result
          // Add isError if the tool result has it, or default to false
          existingCall.isError = 'isError' in result ? Boolean(result.isError) : false
        } else {
          // Create new result entry if no matching call exists
          toolCallsMap.set(result.toolCallId, {
            type: 'tool-result',
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            result: result.result,
            isError: 'isError' in result ? Boolean(result.isError) : false,
          })
        }
      }
    }

    // Convert Map to array
    return Array.from(toolCallsMap.values())
  }

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

  /**
   * Transform a generateText response into a single ChatMessageSelect with merged tool calls
   */
  generateChatMessagesFromResponse<T extends ToolSet>(
    response: GenerateTextResult<T, unknown>,
    userId: string,
    chatId = ''
  ): ChatMessageSelect[] {
    const timestamp = new Date().toISOString()

    // Get the final assistant message content
    const assistantContent = this.getLastAssistantMessage(response.response.messages)

    const toolCalls = []
    for (const step of response.steps) {
      if (step.toolCalls) toolCalls.push(...step.toolCalls)
      if (step.toolResults) toolCalls.push(...step.toolResults)
    }

    // Get merged tool calls using the improved method
    const mergedToolCalls = this.mergeToolCallsAndResults(response)
    console.log('Merged tool calls:', mergedToolCalls)

    // Create a single ChatMessageSelect with the final assistant content and merged tool calls
    return [
      {
        id: crypto.randomUUID(),
        chatId,
        userId,
        role: 'assistant',
        content:
          typeof assistantContent === 'string'
            ? assistantContent
            : JSON.stringify(assistantContent),
        toolCalls,
        reasoning: response.reasoning || null,
        files: [],
        parentMessageId: null,
        messageIndex: '0',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]
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
  async getOrCreateActiveChat(
    userId: string,
    chatId?: string,
    onChatDoesNotExist?: (chatId: string) => Promise<void>
  ) {
    try {
      if (chatId) {
        const existingChat = await db
          .select()
          .from(chat)
          .where(eq(chat.id, chatId))
          .limit(1)
          .then(takeUniqueOrThrow)
          .catch(() => null)

        if (!existingChat) {
          await onChatDoesNotExist?.(chatId)
        }

        if (existingChat) {
          return existingChat
        }
      }

      // Create new chat if chatId wasn't provided or chat wasn't found
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
      console.error('Error creating or fetching chat:', error)
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
      .orderBy(orderBy === 'desc' ? desc(chatMessage.createdAt) : chatMessage.createdAt)

    return query
  }

  /**
   * Save a complete AI interaction with tool calls in a transaction
   */
  async saveCompleteConversation<T extends ToolSet>(
    userId: string,
    chatId: string,
    userMessage: string,
    response: Awaited<ReturnType<typeof generateText<T>>>
  ) {
    const userMessageId = crypto.randomUUID()
    const assistantMessageId = crypto.randomUUID()

    return db.transaction(async (t) => {
      const currentDate = new Date()
      const userDate = currentDate.toISOString()
      // Add 1 second to the assistant date to ensure correct ordering
      // This is a workaround for the issue where the assistant message appears before the user message
      const assistantDate = new Date(currentDate.getTime() + 1000).toISOString()

      // Insert user message
      await t
        .insert(chatMessage)
        .values({
          id: userMessageId,
          userId,
          chatId,
          role: 'user',
          content: userMessage,
          messageIndex: '0',
          createdAt: userDate,
          updatedAt: userDate,
        })
        .returning()
        .then(takeUniqueOrThrow)

      // Insert assistant response with tool calls
      const aiContent = this.getLastAssistantMessage(response.response.messages)

      const toolCalls = []
      for (const step of response.steps) {
        if (step.toolCalls) toolCalls.push(...step.toolCalls)
        if (step.toolResults) toolCalls.push(...step.toolResults)
      }

      return await t
        .insert(chatMessage)
        .values({
          id: assistantMessageId,
          userId,
          chatId,
          role: 'assistant',
          content: aiContent,
          toolCalls: toolCalls,
          reasoning: response.reasoning,
          parentMessageId: userMessageId,
          messageIndex: '1',
          createdAt: assistantDate,
          updatedAt: assistantDate,
        })
        .returning()
        .then(takeUniqueOrThrow)
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
   * Reconstruct the full conversation history with tool calls
   * This is useful for replaying a conversation with all tool calls and results
   */
  async getConversationWithToolCalls(chatId: string, options: ChatMessagesOptions = {}) {
    const messages = await this.getChatMessages(chatId, options)
    return messages
  }
}
