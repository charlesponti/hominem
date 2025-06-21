import { streamText } from 'ai'
import type { ActionFunctionArgs } from 'react-router'
import { ChatDatabaseService } from '~/lib/services/chat-db.server.js'
import type { ProcessedFile } from '~/lib/services/file-processor.server.js'
import { model } from '~/lib/services/llm.server.js'
import { PerformanceMonitor } from '~/lib/services/performance-monitor.server.js'
import { withRateLimit } from '~/lib/services/rate-limit.server.js'

interface ChatStreamRequest {
  message: string
  chatId?: string
  userId?: string
  files?: ProcessedFile[]
  searchContext?: string
  voiceMode?: boolean
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  createNewChat?: boolean
  chatTitle?: string
}

interface StreamChunk {
  content?: string
  done?: boolean
}

interface StreamResponse {
  type: 'content' | 'audio' | 'complete'
  content?: string
  fullResponse?: string
  chatId?: string
  audio?: {
    fileId: string
    url: string
    duration: number
    voice: string
  }
  finishReason?: string
}

interface TTSResponse {
  audio: {
    fileId: string
    url: string
    duration: number
    voice: string
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  return withRateLimit('chatStream')(request, async () => {
    try {
      const body: ChatStreamRequest = await request.json()
      const {
        message,
        chatId,
        userId = 'anonymous',
        files = [],
        searchContext,
        voiceMode = false,
        conversationHistory = [],
        createNewChat = false,
        chatTitle,
      } = body

      if (!message && files.length === 0) {
        return new Response('Message or files required', { status: 400 })
      }

      let currentChatId = chatId

      // Create new chat if requested
      if (createNewChat && userId !== 'anonymous') {
        try {
          const newChat = await PerformanceMonitor.timeFunction(
            'db_create_chat',
            () =>
              ChatDatabaseService.createChat({
                title: chatTitle || generateChatTitle(message),
                userId,
              }),
            { userId }
          )
          currentChatId = newChat.id
        } catch (error) {
          PerformanceMonitor.recordError(
            error instanceof Error ? error : new Error(String(error)),
            '/api/chat-stream',
            userId,
            { operation: 'create_chat' }
          )
          console.warn('Failed to create chat in database:', error)
          // Continue without database - chat will work in memory only
        }
      }

      // Save user message to database if we have a chat ID and user ID
      if (currentChatId && userId !== 'anonymous') {
        try {
          const userMessage = await ChatDatabaseService.addMessage({
            chatId: currentChatId,
            userId,
            role: 'user',
            content: message,
            files: files?.map((f) => ({
              type: f.type.startsWith('image/') ? 'image' : 'file',
              filename: f.originalName,
              mimeType: f.mimetype,
              size: f.size,
            })),
          })
        } catch (error) {
          console.warn('Failed to save user message:', error)
          // Continue without database persistence
        }
      }

      // Get conversation history from database if available
      let dbConversationHistory = conversationHistory
      if (currentChatId && conversationHistory.length === 0) {
        try {
          dbConversationHistory = await ChatDatabaseService.getConversationContext(currentChatId)
        } catch (error) {
          console.warn('Failed to get conversation history:', error)
          // Use provided history or empty array
        }
      }

      // Build the conversation context
      const messages = buildConversationMessages(
        message,
        files,
        searchContext,
        dbConversationHistory
      )

      // Create streaming response with performance monitoring
      const streamTimer = PerformanceMonitor.createTimer('llm_stream_start', {
        model: 'gpt-4',
        messageCount: messages.length,
        userId,
      })

      // Get the stream from the AI package
      const response = streamText({
        model,
        messages,
        temperature: 0.7,
        maxTokens: 2000,
        presencePenalty: 0,
        frequencyPenalty: 0.1,
      })

      streamTimer.end()

      // Return the stream directly
      return response.toDataStreamResponse()
    } catch (error) {
      console.error('Chat stream error:', error)
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  })
}

function buildConversationMessages(
  message: string,
  files: ProcessedFile[],
  searchContext?: string,
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
) {
  const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = []

  // System message
  messages.push({
    role: 'system',
    content: `You are a helpful, knowledgeable AI assistant. You can analyze files, answer questions, and provide detailed explanations. Be concise but thorough in your responses.

${files.length > 0 ? 'The user has attached files that you should analyze and reference in your response.' : ''}
${searchContext ? 'Additional web search context has been provided to help answer the question.' : ''}`,
  })

  // Add conversation history (limit to last 10 messages to stay within token limits)
  const recentHistory = conversationHistory.slice(-10)
  messages.push(...recentHistory)

  // Build user message with context
  let userMessage = message

  // Add file context
  if (files.length > 0) {
    userMessage += '\n\nAttached files:\n'
    files.forEach((file, index) => {
      userMessage += `\n${index + 1}. **${file.originalName}** (${file.type}, ${formatFileSize(file.size)})`

      if (file.textContent) {
        userMessage += `\nContent: ${file.textContent.substring(0, 1000)}${file.textContent.length > 1000 ? '...' : ''}`
      }

      if (file.metadata?.summary) {
        userMessage += `\nSummary: ${file.metadata.summary}`
      }

      if (file.content) {
        userMessage += `\nExtracted content: ${file.content}`
      }
    })
  }

  // Add search context
  if (searchContext) {
    userMessage += `\n\nWeb search context:\n${searchContext}`
  }

  messages.push({
    role: 'user',
    content: userMessage,
  })

  return messages
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

function generateChatTitle(message: string): string {
  // Generate a title from the first message
  const maxLength = 50
  const cleaned = message.trim().replace(/\s+/g, ' ')

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  // Find a good break point near the limit
  const truncated = cleaned.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.7) {
    return `${truncated.substring(0, lastSpace)}...`
  }

  return `${truncated}...`
}
