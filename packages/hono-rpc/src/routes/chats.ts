import { ChatService, MessageService } from '@hominem/chat-services';
import { NotFoundError, InternalError, ValidationError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
import { zValidator } from '@hono/zod-validator';
import { convertToCoreMessages, streamText, type CoreMessage, type Message } from 'ai';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
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
} from '../types/chat.types';
import { toCoreMessage, typeToolsForAI } from '../utils/ai-adapters';
import { getLMStudioAdapter } from '../utils/llm';
import { getAvailableTools } from '../utils/tools';

const chatService = new ChatService();
const messageService = new MessageService();

const ensureChatAndUser = async (userId: string | undefined, chatId: string | undefined) => {
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const currentChat = await chatService.getOrCreateActiveChat(userId, chatId);

  if (!currentChat) {
    throw new Error('Failed to get or create chat');
  }

  return currentChat;
};

/**
 * No serialization helpers needed!
 * Database types are returned directly - timestamps already as strings.
 */

const chatsCreateSchema = z.object({
  title: z.string().min(1),
});

const chatsUpdateSchema = z.object({
  title: z.string().min(1),
});

const chatsMessagesQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
});

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
    const chatId = c.req.param('id') as string;
    const userId = c.get('userId')!;

    const [chatData, messagesData] = await Promise.all([
      chatService.getChatById(chatId, userId),
      messageService.getChatMessages(chatId, { limit: 10 }),
    ]);

    if (!chatData) {
      throw new NotFoundError('Chat not found');
    }

    return c.json<ChatsGetOutput>({
      ...chatData,
      messages: messagesData,
    });
  })

  // Delete chat
  .delete('/', async (c) => {
    const chatId = c.req.param('id') as string;
    const userId = c.get('userId')!;

    const success_result = await chatService.deleteChat(chatId, userId);
    return c.json({ success: success_result });
  })

  // Update chat title
  .patch('/', zValidator('json', chatsUpdateSchema), async (c) => {
    const chatId = c.req.param('id') as string;
    const userId = c.get('userId')!;
    const { title } = c.req.valid('json');

    const chatData = await chatService.updateChatTitle(chatId, title, userId);
    return c.json<ChatsUpdateOutput>({ success: !!chatData });
  })

  // Send message with streaming
  .post('/send', zValidator('json', chatsSendSchema), async (c) => {
    const userId = c.get('userId')!;
    const chatId = c.req.param('id') as string;
    const { message } = c.req.valid('json');

    const currentChat = await ensureChatAndUser(userId, chatId);
    const startTime = Date.now();

    const historyMessages = await messageService.getChatMessages(currentChat.id, {
      limit: 20,
      orderBy: 'asc',
    });

    const userMessage = await messageService.addMessage({
      chatId: currentChat.id,
      userId,
      role: 'user',
      content: message,
    });

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
    ];

    const adapter = getLMStudioAdapter();
    const { textStream, toolCalls } = await streamText({
      model: adapter,
      tools: typeToolsForAI(getAvailableTools(userId)),
      messages: messagesWithNewUser,
    });

    let assistantMessage = await messageService.addMessage({
      chatId: currentChat.id,
      userId: '',
      role: 'assistant',
      content: '',
    });

    if (!assistantMessage) {
      throw new InternalError('Failed to create assistant message');
    }

    let accumulatedContent = '';
    interface ToolCallEntry {
      toolName: string;
      toolCallId: string;
      args: Record<string, unknown>;
    }
    const accumulatedToolCalls: ToolCallEntry[] = [];

    try {
      // Collect stream results
      const textPromise = (async () => {
        for await (const chunk of textStream) {
          accumulatedContent += chunk;
        }
      })();

      const toolsPromise = (async () => {
        const calls = await toolCalls;
        for (const call of calls) {
          accumulatedToolCalls.push(call);
        }
      })();

      await Promise.all([textPromise, toolsPromise]);

      const updatedAssistantMessage = await messageService.updateMessage({
        messageId: assistantMessage.id,
        content: accumulatedContent,
        toolCalls: accumulatedToolCalls.map((tc) => ({
          toolName: tc.toolName,
          type: 'tool-call',
          toolCallId: tc.toolCallId,
          args: tc.args as Record<string, string>,
        })),
      });
      if (updatedAssistantMessage) {
        assistantMessage = updatedAssistantMessage;
      }
    } catch (streamError) {
      logger.error('[chats.send] Error consuming stream', { error: streamError });
      const updatedOnError = await messageService.updateMessage({
        messageId: assistantMessage.id,
        content: accumulatedContent || '[Error: Stream processing failed]',
      });
      if (updatedOnError) {
        assistantMessage = updatedOnError;
      }
    }

    // Ensure both messages are non-null before returning
    if (!assistantMessage || !userMessage) {
      throw new InternalError('Failed to create or update message');
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
    });
  })

  // AI SDK UI message endpoint for web/mobile useChat clients
  .post('/ui/send', zValidator('json', chatsUISendSchema), async (c) => {
    const userId = c.get('userId')!
    const routeChatId = c.req.param('id') as string
    const { messages } = c.req.valid('json')

    const currentChat = await ensureChatAndUser(userId, routeChatId)
    const latestUserMessage = [...messages]
      .reverse()
      .find((candidate) => candidate.role === 'user' && candidate.content.trim().length > 0)

    if (!latestUserMessage) {
      throw new ValidationError('messages must include at least one user message with content')
    }

    await messageService.addMessage({
      chatId: currentChat.id,
      userId,
      role: 'user',
      content: latestUserMessage.content,
    })

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
      model: getLMStudioAdapter(),
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

        const updatedAssistantMessage = await messageService.updateMessage({
          messageId: assistantMessageId,
          content: event.text,
          ...(persistedToolCalls.length > 0 ? { toolCalls: persistedToolCalls } : {}),
        })
      },
    })

    return result.toDataStreamResponse()
  })

  // Get messages for a chat
  .get('/messages', zValidator('query', chatsMessagesQuerySchema), async (c) => {
    const chatId = c.req.param('id') as string;
    const { limit, offset } = c.req.valid('query');

    const messagesData = await messageService.getChatMessages(chatId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    return c.json<ChatsGetMessagesOutput>(messagesData);
  });

export const chatsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // Get user's chats
  .get('/', async (c) => {
    const userId = c.get('userId')!;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;

    const chatsData = await chatService.getUserChats(userId, limit);
    return c.json<ChatsListOutput>(chatsData);
  })

  // Create chat
  .post('/', zValidator('json', chatsCreateSchema), async (c) => {
    const userId = c.get('userId')!;
    const { title } = c.req.valid('json');

    const result = await chatService.createChat({ title, userId });
    return c.json<ChatsCreateOutput>(result, 201);
  })

  // Search chats
  .get('/search', async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.query('q');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20;

    if (!query) {
      throw new ValidationError('Query is required');
    }

    const chatsData = await chatService.searchChats({ userId, query, limit });
    return c.json({ chats: chatsData });
  })

  .route('/:id', chatByIdRoutes);
