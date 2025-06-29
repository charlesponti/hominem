import { openai } from '@ai-sdk/openai'
import { allTools } from '@hominem/utils/tools'
import { TRPCError } from '@trpc/server'
import { generateText, tool } from 'ai'
import { writeFileSync } from 'node:fs'
import { z } from 'zod'
import { ChatService } from '../../services/chat.service'
import { protectedProcedure, router } from '../index'

const chatService = new ChatService()

// Helper function to bind userId to tools that need it
function bindUserIdToTools(tools: Record<string, any>, userId: string) {
  const boundTools: Record<string, any> = {}

  for (const [key, originalTool] of Object.entries(tools)) {
    // Check if the tool's parameters schema includes userId
    const hasUserId = originalTool.parameters?.shape?.userId

    if (hasUserId) {
      // Create a new tool that automatically injects userId
      boundTools[key] = tool({
        description: originalTool.description,
        parameters: originalTool.parameters.omit({ userId: true }),
        execute: async (args: any) => {
          return originalTool.execute({ ...args, userId })
        },
      })
    } else {
      // Use the original tool as-is
      boundTools[key] = originalTool
    }
  }

  return boundTools
}

export const chatRouter = router({
  generate: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        chatId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx
      const { message, chatId } = input

      if (!userId) {
        throw new Error('Unauthorized')
      }

      // Get or create chat
      const currentChat = await chatService.getOrCreateActiveChat(userId, chatId)

      if (!currentChat) {
        throw new Error('Failed to get or create chat')
      }

      try {
        // Bind userId to tools that need it
        const userBoundTools = bindUserIdToTools(allTools, userId)

        // Generate AI response using messages format with tools
        const response = await generateText({
          model: openai('gpt-4.1'),
          tools: userBoundTools,
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
        })

        writeFileSync(
          'debug.json',
          JSON.stringify(
            {
              userId,
              chatId: currentChat.id,
              response,
            },
            null,
            2
          )
        )

        try {
          await chatService.saveCompleteConversation(userId, currentChat.id, message, response)
        } catch (saveError) {
          console.error('Error saving conversation:', saveError)
          // Continue even if saving fails, but log the error
        }

        // If there's no text and no tool calls, something went wrong.
        if (!response.text && response.toolCalls.length === 0) {
          console.error('No text or tool calls in AI response')
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'No response text or tool calls generated',
          })
        }

        return {
          response: response.text,
          toolCalls: response.toolCalls || [],
          chatId: currentChat.id,
        }
      } catch (error) {
        console.error('Error generating chat response:', error)
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate response',
          cause: error,
        })
      }
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx
      const { chatId, limit, offset } = input

      if (!userId) {
        throw new Error('Unauthorized')
      }

      const messages = await chatService.getChatMessages(chatId, { limit, offset })
      return messages
    }),

  getUserChats: protectedProcedure.query(async ({ ctx }) => {
    const { userId } = ctx

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const chats = await chatService.getUserChats(userId)
    return chats
  }),
})
