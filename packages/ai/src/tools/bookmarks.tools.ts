import { logger } from '@ponti/utils/logger'
import { tool } from 'ai'
import { z } from 'zod'

export const create_bookmark = tool({
  description: 'Create a new bookmark',
  parameters: z.object({
    url: z.string().url().describe('URL to bookmark'),
    title: z.string().describe('Title of the bookmark'),
    description: z.string().optional().describe('Description of the bookmark'),
    siteName: z.string().describe('Name of the website'),
  }),
  async execute(args) {
    logger.info(`Creating bookmark: ${args.title} (${args.url})`)
    const result = {
      message: `Created bookmark: ${args.title} (${args.url})`,
    }
    logger.info(`Created bookmark: ${args.title} (${args.url})`)

    return result
  },
})

export const get_bookmarks = tool({
  description: 'Get all bookmarks or search for specific bookmarks',
  parameters: z.object({
    query: z.string().optional().describe('Search query for bookmarks'),
    siteName: z.string().optional().describe('Filter by website name'),
  }),
  async execute(args) {
    return {
      message: `Retrieved bookmarks${args.query ? ` with query: ${args.query}` : ''}${
        args.siteName ? ` from ${args.siteName}` : ''
      }`,
    }
  },
})

export const update_bookmark = tool({
  description: 'Update a bookmark',
  parameters: z.object({
    bookmarkId: z.string().describe('ID of the bookmark to update'),
    title: z.string().optional().describe('New title for the bookmark'),
    description: z.string().optional().describe('New description for the bookmark'),
  }),
  async execute(args) {
    return {
      message: `Updated bookmark ${args.bookmarkId}`,
    }
  },
})

export const delete_bookmark = tool({
  description: 'Delete a bookmark',
  parameters: z.object({
    bookmarkId: z.string().describe('ID of the bookmark to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted bookmark ${args.bookmarkId}`,
    }
  },
})
