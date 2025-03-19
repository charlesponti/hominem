import { tool } from 'ai'
import { z } from 'zod'

export const create_note = tool({
  description: 'Create a new note',
  parameters: z.object({
    title: z.string().describe('Title of the note'),
    content: z.string().describe('Content of the note'),
    tags: z.array(z.string()).optional().describe('Tags for the note'),
  }),
  async execute(args: { title: string; content: string; tags?: string[] }) {
    return {
      message: `Created note: ${args.title} with ${args.tags?.length || 0} tags`,
    }
  },
})

export const get_notes = tool({
  description: 'Get all notes or search for specific notes',
  parameters: z.object({
    query: z.string().optional().describe('Search query for notes'),
    tags: z.array(z.string()).optional().describe('Filter notes by tags'),
  }),
  async execute(args: { query?: string; tags?: string[] }) {
    return {
      message: `Retrieved notes with query: ${args.query || 'all'} and tags: ${
        args.tags?.join(', ') || 'none'
      }`,
    }
  },
})

export const update_note = tool({
  description: 'Update an existing note',
  parameters: z.object({
    noteId: z.string().describe('ID of the note to update'),
    title: z.string().optional().describe('New title of the note'),
    content: z.string().optional().describe('New content of the note'),
    tags: z.array(z.string()).optional().describe('New tags for the note'),
  }),
  async execute(args: { noteId: string; title?: string; content?: string; tags?: string[] }) {
    return {
      message: `Updated note ${args.noteId}`,
    }
  },
})

export const delete_note = tool({
  description: 'Delete a note',
  parameters: z.object({
    noteId: z.string().describe('ID of the note to delete'),
  }),
  async execute(args: { noteId: string }) {
    return {
      message: `Deleted note ${args.noteId}`,
    }
  },
})
