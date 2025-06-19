import type { ActionFunctionArgs } from 'react-router'
import { ChatDatabaseService } from '~/lib/services/chat-db.server.js'
import type { ProcessedFile } from '~/lib/services/file-processor.server.js'
import { openai } from '~/lib/services/openai.server.js'
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
      let messageId: string | null = null

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
      const streamTimer = PerformanceMonitor.createTimer('openai_stream_start', {
        model: 'gpt-4',
        messageCount: messages.length,
        userId,
      })

      const stream = await openai.chat.completions.create({
        model: 'gpt-4', // Use GPT-4 for best quality
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
        presence_penalty: 0,
        frequency_penalty: 0.1,
      })

      streamTimer.end()

      // Create readable stream for the response
      const encoder = new TextEncoder()
      let fullResponse = ''

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Create assistant message record in database
            if (currentChatId && userId !== 'anonymous') {
              try {
                const assistantMessage = await ChatDatabaseService.addMessage({
                  chatId: currentChatId,
                  userId,
                  role: 'assistant',
                  content: '', // Will be updated as we stream
                })
                messageId = assistantMessage.id
              } catch (error) {
                console.warn('Failed to create assistant message record:', error)
              }
            }

            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || ''

              if (content) {
                fullResponse += content

                // Send chunk to client
                const data = JSON.stringify({
                  type: 'content',
                  content,
                  fullResponse,
                  chatId: currentChatId,
                })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }

              // Check if stream is complete
              if (chunk.choices[0]?.finish_reason) {
                // Save complete assistant response to database
                if (messageId && fullResponse.trim()) {
                  try {
                    await ChatDatabaseService.updateMessage(messageId, fullResponse)
                  } catch (error) {
                    console.warn('Failed to save complete assistant response:', error)
                  }
                }

                // If voice mode is enabled, generate TTS for the complete response
                if (voiceMode && fullResponse.trim()) {
                  try {
                    const ttsResponse = await fetch(
                      `${request.url.replace('/chat-stream', '/speech')}`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          text: fullResponse,
                          voice: 'alloy',
                          speed: 1.0,
                        }),
                      }
                    )

                    if (ttsResponse.ok) {
                      const ttsResult = await ttsResponse.json()
                      const audioData = JSON.stringify({
                        type: 'audio',
                        audio: ttsResult.audio,
                      })
                      controller.enqueue(encoder.encode(`data: ${audioData}\n\n`))
                    }
                  } catch (ttsError) {
                    console.warn('TTS generation failed:', ttsError)
                    // Continue without audio - don't fail the whole response
                  }
                }

                // Send completion signal
                const completeData = JSON.stringify({
                  type: 'complete',
                  fullResponse,
                  finishReason: chunk.choices[0].finish_reason,
                  chatId: currentChatId,
                })
                controller.enqueue(encoder.encode(`data: ${completeData}\n\n`))
                controller.close()
                return
              }
            }
          } catch (error) {
            console.error('Streaming error:', error)
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
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
  const messages: any[] = []

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

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}
