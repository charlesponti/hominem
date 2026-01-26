import { ChatService, MessageService } from '@hominem/chat-services';
import { error, success, isServiceError } from '@hominem/services';
import { chat } from '@tanstack/ai';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { getLMStudioAdapter } from '../utils/llm';
import { getAvailableTools } from '../utils/tools';

/**
 * Chat Routes
 *
 * Handles chat operations using the ApiResult pattern:
 * - Services throw typed errors
 * - HTTP endpoints catch errors and return ApiResult
 * - Clients receive discriminated union with `success` field
 */

const chatService = new ChatService();
const messageService = new MessageService();

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Routes
// ============================================================================

export const chatsRoutes = new Hono<AppContext>()
  // Get user's chats
  .get('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;

      const chats = await chatService.getUserChats(userId, limit);
      return c.json(success(chats));
    } catch (err) {
      console.error('[chats.getUserChats] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch chats'), 500);
    }
  })

  // Get chat by ID
  .get('/:id', authMiddleware, async (c) => {
    try {
      const chatId = c.req.param('id');
      const userId = c.get('userId')!;

      if (!chatId) {
        return c.json(error('VALIDATION_ERROR', 'Chat ID is required'), 400);
      }

      const [chat, messages] = await Promise.all([
        chatService.getChatById(chatId, userId),
        messageService.getChatMessages(chatId, { limit: 10 }),
      ]);

      if (!chat) {
        return c.json(error('NOT_FOUND', 'Chat not found'), 404);
      }

      return c.json(success({ ...chat, messages }));
    } catch (err) {
      console.error('[chats.getChatById] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to get chat'), 500);
    }
  })

  // Create chat
  .post('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const { title } = await c.req.json<{ title: string }>();

      if (!title) {
        return c.json(error('VALIDATION_ERROR', 'Title is required'), 400);
      }

      const result = await chatService.createChat({ title, userId });
      return c.json(success(result), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message), 400);
      }
      console.error('[chats.createChat] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to create chat'), 500);
    }
  })

  // Delete chat
  .delete('/:id', authMiddleware, async (c) => {
    try {
      const chatId = c.req.param('id');
      const userId = c.get('userId')!;

      if (!chatId) {
        return c.json(error('VALIDATION_ERROR', 'Chat ID is required'), 400);
      }

      const success_result = await chatService.deleteChat(chatId, userId);
      return c.json(success({ success: success_result }));
    } catch (err) {
      console.error('[chats.deleteChat] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete chat'), 500);
    }
  })

  // Update chat title
  .patch('/:id', authMiddleware, async (c) => {
    try {
      const chatId = c.req.param('id');
      const userId = c.get('userId')!;
      const { title } = await c.req.json<{ title: string }>();

      if (!chatId || !title) {
        return c.json(error('VALIDATION_ERROR', 'Chat ID and title are required'), 400);
      }

      const chat = await chatService.updateChatTitle(chatId, title, userId);
      return c.json(success({ success: !!chat }));
    } catch (err) {
      console.error('[chats.updateChatTitle] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to update chat title'), 500);
    }
  })

  // Search chats
  .get('/search', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const query = c.req.query('q');
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20;

      if (!query) {
        return c.json(error('VALIDATION_ERROR', 'Query is required'), 400);
      }

      const chats = await chatService.searchChats({ userId, query, limit });
      return c.json(success({ chats }));
    } catch (err) {
      console.error('[chats.searchChats] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to search chats'), 500);
    }
  })

  // Send message with streaming
  .post('/:id/send', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const chatId = c.req.param('id');
      const { message } = await c.req.json<{ message: string }>();

      if (!message || message.trim().length === 0) {
        return c.json(error('VALIDATION_ERROR', 'Message cannot be empty'), 400);
      }

      if (message.length > 10000) {
        return c.json(error('VALIDATION_ERROR', 'Message is too long (max 10000 characters)'), 400);
      }

      const currentChat = await ensureChatAndUser(userId, chatId);
      const startTime = Date.now();

      // Load conversation history for context (last 20 messages)
      const historyMessages = await messageService.getChatMessages(currentChat.id, {
        limit: 20,
        orderBy: 'asc',
      });

      // Save the user message first
      const userMessage = await messageService.addMessage({
        chatId: currentChat.id,
        userId,
        role: 'user',
        content: message,
      });

      // Add the new user message to context
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

      // Create chat stream using TanStack AI directly
      // Uses LM Studio adapter for OpenAI-compatible endpoint
      const adapter = getLMStudioAdapter();
      const stream = chat({
        adapter,
        tools: getAvailableTools(userId),
        messages: messagesWithNewUser,
      });

      // Create a placeholder for the assistant message
      let assistantMessage = await messageService.addMessage({
        chatId: currentChat.id,
        userId: '', // Assistant messages don't have a userId
        role: 'assistant',
        content: '', // Will be updated as we stream
      });

      if (!assistantMessage) {
        throw new Error('Failed to create assistant message');
      }

      // Accumulate the stream and update the assistant message only once at the end
      let accumulatedContent = '';
      const toolCalls = [];

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

      return c.json(
        success({
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
        }),
      );
    } catch (err) {
      console.error('[chats.send] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to send message with streaming'), 500);
    }
  })

  // Get messages for a chat
  .get('/:id/messages', authMiddleware, async (c) => {
    try {
      const chatId = c.req.param('id');
      const userId = c.get('userId')!;
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;
      const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : undefined;

      const messages = await messageService.getChatMessages(chatId, {
        limit,
        offset,
      });
      return c.json(success(messages));
    } catch (err) {
      console.error('[chats.getMessages] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch messages'), 500);
    }
  });
