import { db, NotFoundError, ForbiddenError, InternalError } from '@hominem/db'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import * as z from 'zod'

import type {
  MessagesGetOutput,
  MessagesUpdateOutput,
  MessagesDeleteOutput,
  MessagesDeleteAfterOutput,
  ChatMessage,
} from '../types/chat.types'

import { authMiddleware, type AppContext } from '../middleware/auth'

const updateMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
})

const deleteMessagesAfterSchema = z.object({
  chatId: z.string(),
  afterTimestamp: z.string(),
})

// Helper: Get message by ID with ownership check (via chat)
async function getMessageWithOwnershipCheck(messageId: string, userId: string) {
  const message = await db
    .selectFrom('chat_message')
    .selectAll()
    .where('id', '=', messageId)
    .executeTakeFirst()

  if (!message) {
    throw new NotFoundError('Message not found')
  }

  // Verify ownership via the chat
  const chat = await db
    .selectFrom('chat')
    .selectAll()
    .where('id', '=', message.chat_id)
    .where('user_id', '=', userId)
    .executeTakeFirst()

  if (!chat) {
    throw new ForbiddenError('Message not found or access denied', 'ownership')
  }

  return message
}

// Helper: Delete messages after timestamp
async function deleteMessagesAfterTimestamp(chatId: string, afterTimestamp: string, userId: string) {
  // Verify chat ownership
  const chat = await db
    .selectFrom('chat')
    .selectAll()
    .where('id', '=', chatId)
    .where('user_id', '=', userId)
    .executeTakeFirst()

  if (!chat) {
    throw new ForbiddenError('Chat not found or access denied', 'ownership')
  }

  // Delete messages after the timestamp
  const result = await db
    .deleteFrom('chat_message')
    .where('chat_id', '=', chatId)
    .where('created_at', '>', new Date(afterTimestamp))
    .execute()

  return result.length
}

export const messagesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // Get message by ID
  .get('/:messageId', async (c) => {
    const userId = c.get('userId')!
    const messageId = c.req.param('messageId')

    const message = await getMessageWithOwnershipCheck(messageId, userId)
    return c.json<MessagesGetOutput>({
      message: message as unknown as ChatMessage,
    })
  })

  // Update message
  .patch('/:messageId', zValidator('json', updateMessageSchema), async (c) => {
    const userId = c.get('userId')!
    const messageId = c.req.param('messageId')
    const { content } = c.req.valid('json')

    const message = await getMessageWithOwnershipCheck(messageId, userId)

    if (message.role !== 'user') {
      throw new ForbiddenError('Only user messages can be edited')
    }

    // Delete messages after this one
    await deleteMessagesAfterTimestamp(message.chat_id, message.created_at as any as string, userId)

    const updatedMessage = await db
      .updateTable('chat_message')
      .set({
        content,
        updated_at: new Date(),
      })
      .where('id', '=', messageId)
      .returningAll()
      .executeTakeFirst()

    if (!updatedMessage) {
      throw new InternalError('Failed to update message')
    }
    return c.json<MessagesUpdateOutput>({
      message: updatedMessage as unknown as ChatMessage,
    })
  })

  // Delete message
  .delete('/:messageId', async (c) => {
    const userId = c.get('userId')!
    const messageId = c.req.param('messageId')

    const message = await getMessageWithOwnershipCheck(messageId, userId)

    const result = await db.deleteFrom('chat_message').where('id', '=', messageId).execute()

    return c.json<MessagesDeleteOutput>({ success: result.length > 0 })
  })

  // Delete messages after a timestamp
  .post('/delete-after', zValidator('json', deleteMessagesAfterSchema), async (c) => {
    const userId = c.get('userId')!
    const { chatId, afterTimestamp } = c.req.valid('json')

    const deletedCount = await deleteMessagesAfterTimestamp(chatId, afterTimestamp, userId)
    return c.json<MessagesDeleteAfterOutput>({ deletedCount })
  })
