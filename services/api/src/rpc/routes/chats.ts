import crypto from 'node:crypto'

import {
  archiveChatQuery,
  createChatQuery,
  getChatByIdQuery,
  getUserChatsQuery,
  getChatByNoteIdQuery,
  updateChatTitleQuery,
  deleteChatQuery,
  MessageService,
} from '@hominem/chat-services'
import type { ArtifactType, ClassificationResponse } from '@hominem/chat-services/types'
import { FileProcessorService } from '@hominem/services/files'
import { fileStorageService } from '@hominem/utils/storage'
import { logger } from '@hominem/utils/logger'
import { zValidator } from '@hono/zod-validator'
import { convertToCoreMessages, streamText, generateText, generateObject, type CoreMessage, type Message } from 'ai'
import { Hono } from 'hono'
import * as z from 'zod'

import { InternalError, ForbiddenError, ValidationError, UnavailableError } from '../errors'
import { setReviewItem } from '../services/review-store'

import { authMiddleware, type AppContext } from '../middleware/auth'
import {
  type ChatsListOutput,
  type ChatsGetOutput,
  type ChatsArchiveOutput,
  type ChatsCreateOutput,
  type ChatsUpdateOutput,
  type ChatsSendOutput,
  type ChatsGetMessagesOutput,
  chatsSendSchema,
  chatsUISendSchema,
} from '@hominem/rpc/types/chat.types'
import { toCoreMessage } from '../utils/ai-adapters'
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

const toPersistedToolCalls = (
  calls: Array<{ toolName: string; toolCallId: string; args: Record<string, unknown> }>,
) =>
  calls.map((toolCall) => ({
    toolName: toolCall.toolName,
    type: 'tool-call' as const,
    toolCallId: toolCall.toolCallId,
    args: toolCall.args as Record<string, string>,
  }))

const GENERATION_ERROR_FALLBACK = '[Error: Stream processing failed]'
const ATTACHMENT_TEXT_PREVIEW_LIMIT = 2_000

const toAssistantErrorContent = (error: unknown) => {
  const message = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').trim()
  if (!message) {
    return GENERATION_ERROR_FALLBACK
  }

  return `[Error: ${message}]`
}

type ResolvedChatAttachment = {
  fileId: string
  filename: string
  mimeType: string
  size: number
  type: 'image' | 'file'
  url: string
  extractedText?: string
}

function inferMimeTypeFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'csv':
      return 'text/csv'
    case 'doc':
      return 'application/msword'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'gif':
      return 'image/gif'
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg'
    case 'mp3':
      return 'audio/mpeg'
    case 'mp4':
      return 'video/mp4'
    case 'ogg':
      return 'audio/ogg'
    case 'pdf':
      return 'application/pdf'
    case 'png':
      return 'image/png'
    case 'txt':
      return 'text/plain'
    case 'wav':
      return 'audio/wav'
    case 'webm':
      return 'video/webm'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

function getOriginalFilename(storedName: string, fileId: string): string {
  const prefix = `${fileId}-`

  if (storedName.startsWith(prefix)) {
    return storedName.slice(prefix.length)
  }

  return storedName
}

function buildAttachmentPromptContext(attachments: ResolvedChatAttachment[]): string {
  if (attachments.length === 0) {
    return ''
  }

  return [
    '',
    'Attached files:',
    ...attachments.map((attachment, index) => {
      const details = `${index + 1}. ${attachment.filename} | ${attachment.mimeType}`
      const extractedText = attachment.extractedText?.trim()

      if (!extractedText) {
        return details
      }

      return `${details}\nExtracted content:\n${extractedText.slice(0, ATTACHMENT_TEXT_PREVIEW_LIMIT)}`
    }),
  ].join('\n')
}

async function resolveChatAttachments(userId: string, fileIds: string[]): Promise<ResolvedChatAttachment[]> {
  if (fileIds.length === 0) {
    return []
  }

  const userFiles = await fileStorageService.listUserFiles(userId)

  return await Promise.all(
    [...new Set(fileIds)].map(async (fileId) => {
      const storedFile = userFiles.find((file) => file.name.startsWith(fileId))
      const url = await fileStorageService.getFileUrl(fileId, userId)
      const fileData = await fileStorageService.getFile(fileId, userId)

      if (!storedFile || !url || !fileData) {
        throw new ValidationError(`Uploaded file ${fileId} is not available`)
      }

      const filename = getOriginalFilename(storedFile.name, fileId)
      const mimeType = inferMimeTypeFromFilename(filename)
      const processedFile = await FileProcessorService.processFile(
        fileData,
        filename,
        mimeType,
        fileId,
      )
      const extractedText = processedFile.textContent || processedFile.content

      return {
        fileId,
        filename,
        mimeType,
        size: storedFile.size,
        type: mimeType.startsWith('image/') ? 'image' : 'file',
        url,
        ...(extractedText ? { extractedText } : {}),
      }
    }),
  )
}

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
      throw new ForbiddenError('Chat not found or access denied', { reason: 'ownership' })
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
      throw new ForbiddenError('Chat not found or access denied', { reason: 'ownership' })
    }

    return c.json({ success: true })
  })

  // Update chat title
  .patch('/', zValidator('json', chatsUpdateSchema), async (c) => {
    const chatId = c.req.param('id') as string
    const userId = c.get('userId')!
    const { title } = c.req.valid('json')

    const updated = await updateChatTitleQuery(chatId, title, userId)
    if (!updated) {
      throw new ForbiddenError('Chat not found or access denied', { reason: 'ownership' })
    }

    return c.json<ChatsUpdateOutput>({ success: true })
  })

  .post('/archive', async (c) => {
    const chatId = c.req.param('id') as string
    const userId = c.get('userId')!

    const archived = await archiveChatQuery(chatId, userId)
    if (!archived) {
      throw new ForbiddenError('Chat not found or access denied', { reason: 'ownership' })
    }

    return c.json<ChatsArchiveOutput>(archived)
  })

  // Send message with streaming
  .post('/send', zValidator('json', chatsSendSchema), async (c) => {
    const userId = c.get('userId')!
    const chatId = c.req.param('id') as string
    const { message, fileIds = [] } = c.req.valid('json')

    logger.info('[chats.send] Request received', {
      chatId,
      userId,
      messageLength: message.length,
      fileCount: fileIds.length,
    })

    // Get or verify chat exists
    let currentChat = await getChatByIdQuery(chatId, userId)
    if (!currentChat) {
      throw new ForbiddenError('Chat not found or access denied', { reason: 'ownership' })
    }

    logger.info('[chats.send] Chat found', { chatId })

    const startTime = Date.now()

    const historyMessages = await messageService.getChatMessages(currentChat.id, {
      limit: 20,
      orderBy: 'asc',
    })

    const attachments = await resolveChatAttachments(userId, fileIds)
    const userMessageContent = `${message.trim()}${buildAttachmentPromptContext(attachments)}`.trim()

    logger.info('[chats.send] History loaded', { messageCount: historyMessages.length })

    const messagesWithNewUser: CoreMessage[] = [
      ...historyMessages.map((m) =>
        toCoreMessage({
          role: m.role,
          content: m.content,
        }),
      ),
      {
        role: 'user',
        content: userMessageContent,
      },
    ]

    const adapter = getOpenAIAdapter()
    logger.info('[chats.send] Calling generateText', { model: adapter.modelId, totalMessages: messagesWithNewUser.length })

    let accumulatedContent = ''
    interface ToolCallEntry {
      toolName: string
      toolCallId: string
      args: Record<string, unknown>
    }
    const accumulatedToolCalls: ToolCallEntry[] = []
    let didGenerationFail = false

    try {
      const result = await generateText({
        model: adapter,
        tools: getAvailableTools(userId),
        messages: messagesWithNewUser,
      })
      logger.info('[chats.send] generateText complete', {
        elapsedMs: Date.now() - startTime,
        contentLength: result.text.length,
        toolCallCount: result.toolCalls.length,
      })
      accumulatedContent = result.text
      for (const call of result.toolCalls) {
        accumulatedToolCalls.push({
          toolName: call.toolName,
          toolCallId: call.toolCallId,
          args: call.args as Record<string, unknown>,
        })
      }
    } catch (error) {
      didGenerationFail = true
      accumulatedContent = toAssistantErrorContent(error)
      logger.error('[chats.send] generateText failed', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : undefined,
        cause: error instanceof Error ? String(error.cause) : undefined,
        stack: error instanceof Error ? error.stack : undefined,
      })
    }

    const persistedMessages = await messageService.addMessages([
      {
        chatId: currentChat.id,
        userId,
        role: 'user',
        content: message,
        ...(attachments.length > 0
          ? {
              files: attachments.map((attachment) => ({
                type: attachment.type,
                fileId: attachment.fileId,
                url: attachment.url,
                filename: attachment.filename,
                mimeType: attachment.mimeType,
                size: attachment.size,
                ...(attachment.extractedText
                  ? {
                      metadata: {
                        extractedText: attachment.extractedText.slice(0, ATTACHMENT_TEXT_PREVIEW_LIMIT),
                      },
                    }
                  : {}),
              })),
            }
          : {}),
      },
      {
        chatId: currentChat.id,
        userId,
        role: 'assistant',
        content: didGenerationFail ? accumulatedContent || GENERATION_ERROR_FALLBACK : accumulatedContent,
        ...(didGenerationFail
          ? {}
          : {
              toolCalls: accumulatedToolCalls.map((tc) => ({
                toolName: tc.toolName,
                type: 'tool-call' as const,
                toolCallId: tc.toolCallId,
                args: tc.args as Record<string, string>,
              })),
            }),
      },
    ])

    const [userMessage, assistantMessage] = persistedMessages
    if (!userMessage || !assistantMessage) {
      throw new InternalError('Failed to persist chat messages')
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

    const currentChat = await getChatByIdQuery(routeChatId, userId)
    if (!currentChat) {
      throw new ForbiddenError('Chat not found or access denied', { reason: 'ownership' })
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((candidate) => candidate.role === 'user' && candidate.content.trim().length > 0)

    if (!latestUserMessage) {
      throw new ValidationError('messages must include at least one user message with content')
    }

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

    let result: ReturnType<typeof streamText>

    try {
      result = streamText({
        model: getOpenAIAdapter(),
        tools: getAvailableTools(userId),
        messages: coreMessages,
        async onFinish(event) {
          const persistedToolCalls = toPersistedToolCalls(
            event.toolCalls.map((call) => ({
              toolName: call.toolName,
              toolCallId: call.toolCallId,
              args: call.args as Record<string, unknown>,
            })),
          )

          await messageService.addMessages([
            {
              chatId: currentChat.id,
              userId,
              role: 'user',
              content: latestUserMessage.content,
            },
            {
              chatId: currentChat.id,
              userId,
              role: 'assistant',
              content: event.text,
              ...(persistedToolCalls.length > 0 ? { toolCalls: persistedToolCalls } : {}),
            },
          ])
        },
      })
    } catch (error) {
      logger.error('[chats.ui.send] Failed to start generation', { error })
      throw new UnavailableError('Failed to generate assistant response')
    }

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

  // Classify the conversation into a reviewable artifact
  .post(
    '/classify',
    zValidator('json', z.object({ targetType: z.enum(['note', 'task', 'task_list', 'tracker']) })),
    async (c) => {
      const chatId = c.req.param('id') as string
      const userId = c.get('userId')!
      const { targetType } = c.req.valid('json') as { targetType: ArtifactType }

      const chat = await getChatByIdQuery(chatId, userId)
      if (!chat) {
        throw new ForbiddenError('Chat not found or access denied', { reason: 'ownership' })
      }

      const messagesData = await messageService.getChatMessages(chatId, { limit: 50, orderBy: 'asc' })
      if (messagesData.length === 0) {
        throw new ValidationError('No messages to classify')
      }

      const transcript = messagesData
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n')

      const classifySchema = z.object({
        proposedTitle: z.string().max(100),
        proposedChanges: z.array(z.string()).max(5),
        previewContent: z.string(),
      })

      const { object } = await generateObject<z.infer<typeof classifySchema>>({
        model: getOpenAIAdapter(),
        schema: classifySchema,
        prompt: [
          `You are classifying a chat conversation into a "${targetType}" artifact.`,
          'Produce:',
          '- proposedTitle: a concise, descriptive title (max 100 chars)',
          '- proposedChanges: up to 5 short human-readable summary lines of what would be captured',
          '- previewContent: the full Markdown content of the proposed artifact',
          '',
          'Conversation:',
          transcript,
        ].join('\n'),
      })

      const reviewItemId = crypto.randomUUID()
      const reviewItem = {
        id: reviewItemId,
        sessionId: chatId,
        proposedType: targetType,
        proposedTitle: object.proposedTitle,
        proposedChanges: object.proposedChanges,
        previewContent: object.previewContent,
        createdAt: new Date().toISOString(),
      }

      setReviewItem(reviewItem)

      return c.json<ClassificationResponse>({
        proposedType: targetType,
        proposedTitle: object.proposedTitle,
        proposedChanges: object.proposedChanges,
        previewContent: object.previewContent,
        reviewItemId,
      })
    },
  )

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
