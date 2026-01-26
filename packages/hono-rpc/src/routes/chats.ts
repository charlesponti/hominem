import { ChatService, MessageService } from '@hominem/chat-services';
import { error, success, isServiceError } from '@hominem/services';
import { chat } from '@tanstack/ai';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { getLMStudioAdapter } from '../utils/llm';
import { getAvailableTools } from '../utils/tools';
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
} from '../types/chat.types';

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
 * Serialization Helpers
 */
function serializeChat(c: any): Chat {
  return {
    id: c.id,
    userId: c.userId,
    title: c.title,
    createdAt: typeof c.createdAt === 'string' ? c.createdAt : c.createdAt.toISOString(),
    updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : c.updatedAt.toISOString(),
  };
}

function serializeChatMessage(m: any): ChatMessage {
  return {
    id: m.id,
    chatId: m.chatId,
    userId: m.userId,
    role: m.role,
    content: m.content,
    files: m.files,
    toolCalls: m.toolCalls,
    reasoning: m.reasoning,
    parentMessageId: m.parentMessageId,
    messageIndex: m.messageIndex,
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : m.createdAt.toISOString(),
    updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : m.updatedAt.toISOString(),
  };
}

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

/**
 * Sub-router for routes starting with /api/chats/:id
 */
const chatByIdRoutes = new Hono<AppContext>()
  // Get chat by ID
  .get('/', async (c) => {
    try {
      const chatId = c.req.param('id');
      const userId = c.get('userId')!;

      const [chatData, messagesData] = await Promise.all([
        chatService.getChatById(chatId, userId),
        messageService.getChatMessages(chatId, { limit: 10 }),
      ]);

      if (!chatData) {
        return c.json<ChatsGetOutput>(error('NOT_FOUND', 'Chat not found'), 404);
      }

      return c.json<ChatsGetOutput>(
        success({
          ...serializeChat(chatData),
          messages: messagesData.map(serializeChatMessage),
        }),
      );
    } catch (err) {
      console.error('[chats.getChatById] unexpected error:', err);
      return c.json<ChatsGetOutput>(error('INTERNAL_ERROR', 'Failed to get chat'), 500);
    }
  })

  // Delete chat
  .delete('/', async (c) => {
    try {
      const chatId = c.req.param('id');
      const userId = c.get('userId')!;

      const success_result = await chatService.deleteChat(chatId, userId);
      return c.json(success({ success: success_result }));
    } catch (err) {
      console.error('[chats.deleteChat] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete chat'), 500);
    }
  })

  // Update chat title
  .patch('/', zValidator('json', chatsUpdateSchema), async (c) => {
    try {
      const chatId = c.req.param('id');
      const userId = c.get('userId')!;
      const { title } = c.req.valid('json');

      const chatData = await chatService.updateChatTitle(chatId, title, userId);
      return c.json<ChatsUpdateOutput>(success({ success: !!chatData }));
    } catch (err) {
      console.error('[chats.updateChatTitle] unexpected error:', err);
      return c.json<ChatsUpdateOutput>(error('INTERNAL_ERROR', 'Failed to update chat title'), 500);
    }
  })

  // Send message with streaming
  .post('/send', zValidator('json', chatsSendSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const chatId = c.req.param('id');
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

      const messagesWithNewUser = [
        ...historyMessages.map((m) => ({
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls?.map((m) => ({
            id: m.toolCallId,
            function: {
              name: m.toolName,
              arguments: JSON.stringify(m.args),
            },
            type: 'function' as const,
          })),
        })),
        {
          role: 'user' as const,
          content: message,
        },
      ];

      const adapter = getLMStudioAdapter();
      const stream = chat({
        adapter,
        tools: getAvailableTools(userId),
        messages: messagesWithNewUser,
      });

      let assistantMessage = await messageService.addMessage({
        chatId: currentChat.id,
        userId: '',
        role: 'assistant',
        content: '',
      });

      if (!assistantMessage) {
        throw new Error('Failed to create assistant message');
      }

      let accumulatedContent = '';
      const toolCalls: any[] = [];

      try {
        for await (const event of stream) {
          if (event.type === 'content') {
            accumulatedContent += event.content;
          } else if (event.type === 'tool_call') {
            toolCalls.push(event.toolCall);
          }
        }
        const updatedAssistantMessage = await messageService.updateMessage({
          messageId: assistantMessage.id,
          content: accumulatedContent,
          toolCalls: toolCalls.map((tc) => ({
            toolName: tc.function.name,
            type: 'tool-call',
            toolCallId: tc.id,
            args: JSON.parse(tc.function.arguments) as Record<string, string>,
          })),
        });
        if (updatedAssistantMessage) {
          assistantMessage = updatedAssistantMessage;
        }
      } catch (streamError) {
        console.error('[chats.send] Error consuming stream:', streamError);
        const updatedOnError = await messageService.updateMessage({
          messageId: assistantMessage.id,
          content: accumulatedContent || '[Error: Stream processing failed]',
        });
        if (updatedOnError) {
          assistantMessage = updatedOnError;
        }
      }

      return c.json<ChatsSendOutput>(
        success({
          streamId: assistantMessage.id,
          chatId: currentChat.id,
          chatTitle: currentChat.title,
          messages: {
            user: serializeChatMessage(userMessage),
            assistant: serializeChatMessage(assistantMessage),
          },
          metadata: {
            startTime: startTime,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    } catch (err) {
      console.error('[chats.send] unexpected error:', err);
      return c.json<ChatsSendOutput>(error('INTERNAL_ERROR', 'Failed to send message with streaming'), 500);
    }
  })

  // Get messages for a chat
  .get('/messages', zValidator('query', chatsMessagesQuerySchema), async (c) => {
    try {
      const chatId = c.req.param('id');
      const { limit, offset } = c.req.valid('query');

      const messagesData = await messageService.getChatMessages(chatId, {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
      return c.json<ChatsGetMessagesOutput>(success(messagesData.map(serializeChatMessage)));
    } catch (err) {
      console.error('[chats.getMessages] unexpected error:', err);
      return c.json<ChatsGetMessagesOutput>(error('INTERNAL_ERROR', 'Failed to fetch messages'), 500);
    }
  });

export const chatsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // Get user's chats
  .get('/', async (c) => {
    try {
      const userId = c.get('userId')!;
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;

      const chatsData = await chatService.getUserChats(userId, limit);
      return c.json<ChatsListOutput>(success(chatsData.map(serializeChat)));
    } catch (err) {
      console.error('[chats.getUserChats] unexpected error:', err);
      return c.json<ChatsListOutput>(error('INTERNAL_ERROR', 'Failed to fetch chats'), 500);
    }
  })

  // Create chat
  .post('/', zValidator('json', chatsCreateSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const { title } = c.req.valid('json');

      const result = await chatService.createChat({ title, userId });
      return c.json<ChatsCreateOutput>(success(serializeChat(result)), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<ChatsCreateOutput>(error(err.code, err.message), 400);
      }
      console.error('[chats.createChat] unexpected error:', err);
      return c.json<ChatsCreateOutput>(error('INTERNAL_ERROR', 'Failed to create chat'), 500);
    }
  })

  // Search chats
  .get('/search', async (c) => {
    try {
      const userId = c.get('userId')!;
      const query = c.req.query('q');
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20;

      if (!query) {
        return c.json(error('VALIDATION_ERROR', 'Query is required'), 400);
      }

      const chatsData = await chatService.searchChats({ userId, query, limit });
      return c.json(success({ chats: chatsData.map(serializeChat) }));
    } catch (err) {
      console.error('[chats.searchChats] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to search chats'), 500);
    }
  })

  .route('/:id', chatByIdRoutes);
