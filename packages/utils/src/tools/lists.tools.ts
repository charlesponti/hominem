import { tool } from 'ai'
import { z } from 'zod'

export const create_list = tool({
  description: 'Create a new list',
  parameters: z.object({
    name: z.string().describe('Name of the list'),
    description: z.string().optional().describe('Description of the list'),
  }),
  async execute(args) {
    return {
      message: `Created list: ${args.name}`,
    }
  },
})

export const get_lists = tool({
  description: 'Get all lists',
  parameters: z.object({}),
  async execute() {
    return {
      message: 'Retrieved all lists',
    }
  },
})

export const update_list = tool({
  description: 'Update a list',
  parameters: z.object({
    listId: z.string().describe('ID of the list to update'),
    name: z.string().optional().describe('New name for the list'),
    description: z.string().optional().describe('New description for the list'),
  }),
  async execute(args) {
    return {
      message: `Updated list ${args.listId}`,
    }
  },
})

export const delete_list = tool({
  description: 'Delete a list',
  parameters: z.object({
    listId: z.string().describe('ID of the list to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted list ${args.listId}`,
    }
  },
})

export const invite_to_list = tool({
  description: 'Invite a user to a list',
  parameters: z.object({
    listId: z.string().describe('ID of the list'),
    email: z.string().email().describe('Email of the user to invite'),
  }),
  async execute(args) {
    return {
      message: `Invited ${args.email} to list ${args.listId}`,
    }
  },
})

export const accept_list_invite = tool({
  description: 'Accept an invitation to a list',
  parameters: z.object({
    listId: z.string().describe('ID of the list'),
    invitedUserEmail: z.string().email().describe('Email of the invited user'),
  }),
  async execute(args) {
    return {
      message: `Accepted invitation to list ${args.listId} for ${args.invitedUserEmail}`,
    }
  },
})
