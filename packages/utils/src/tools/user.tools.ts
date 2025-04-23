import { tool } from 'ai'
import { z } from 'zod'

export const get_user_profile = tool({
  description: 'Get the user profile information',
  parameters: z.object({
    userId: z.string().optional().describe('User ID (defaults to current user if not provided)'),
  }),
  async execute(args: { userId?: string }) {
    return {
      message: `Retrieved profile for user ${args.userId || 'current user'}`,
    }
  },
})

export const update_user_profile = tool({
  description: 'Update user profile information',
  parameters: z.object({
    name: z.string().optional().describe('User name'),
    email: z.string().optional().describe('User email'),
    photo_url: z.string().optional().describe('Profile photo URL'),
    birthday: z.string().optional().describe('User birthday'),
  }),
  async execute(args) {
    return {
      message: `Updated user profile with: ${JSON.stringify(args)}`,
    }
  },
})
