import { tool } from 'ai'
import { z } from 'zod'

export const create_chat = tool({
  description: 'Create a new chat conversation',
  parameters: z.object({
    title: z.string().describe('Title for the chat'),
  }),
  async execute(args: { title: string }) {
    return {
      message: `Created new chat: ${args.title}`,
    }
  },
})

export const list_chats = tool({
  description: 'List all chat conversations',
  parameters: z.object({}),
  async execute() {
    return {
      message: 'Listed all chats',
    }
  },
})

export const update_chat = tool({
  description: 'Update a chat conversation',
  parameters: z.object({
    chatId: z.string().describe('ID of the chat to update'),
    title: z.string().describe('New title for the chat'),
  }),
  async execute(args: { chatId: string; title: string }) {
    return {
      message: `Updated chat ${args.chatId} with title: ${args.title}`,
    }
  },
})

export const delete_chat = tool({
  description: 'Delete a chat conversation',
  parameters: z.object({
    chatId: z.string().describe('ID of the chat to delete'),
  }),
  async execute(args: { chatId: string }) {
    return {
      message: `Deleted chat ${args.chatId}`,
    }
  },
})
