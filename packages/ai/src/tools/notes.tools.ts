import { NotesService } from '@ponti/utils/notes'
import { tool } from 'ai'
import { z } from 'zod'

const notesService = new NotesService()

const CreateNoteSchema = z.object({
  title: z.string().describe('Title of the note'),
  content: z.string().describe('Content of the note'),
  tags: z.array(z.string()).optional().describe('Tags for the note'),
  userId: z.string().describe('ID of the user creating the note'),
})
export const create_note = tool({
  description: 'Create a new note',
  parameters: CreateNoteSchema,
  async execute(args: z.infer<typeof CreateNoteSchema>) {
    const note = await notesService.create({
      title: args.title,
      content: args.content,
      tags: args.tags?.map((tag) => ({ value: tag })),
      userId: args.userId,
    })

    return {
      message: `Created note: ${note.title}`,
      note,
    }
  },
})

export const get_notes = tool({
  description: 'Get all notes or search for specific notes',
  parameters: z.object({
    query: z.string().optional().describe('Search query for notes'),
    tags: z.array(z.string()).optional().describe('Filter notes by tags'),
    userId: z.string().describe('ID of the user to get notes for'),
  }),
  async execute(args: { query?: string; tags?: string[]; userId: string }) {
    const notes = await notesService.list(args.userId, args.query, args.tags)

    return {
      message: `Found ${notes.length} notes`,
      notes,
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
    userId: z.string().describe('ID of the user updating the note'),
  }),
  async execute(args: {
    noteId: string
    title?: string
    content?: string
    tags?: string[]
    userId: string
  }) {
    const note = await notesService.update({
      noteId: args.noteId,
      title: args.title,
      content: args.content,
      tags: args.tags?.map((tag) => ({ value: tag })),
      userId: args.userId,
    })

    return {
      message: `Updated note ${note.id}`,
      note,
    }
  },
})

export const delete_note = tool({
  description: 'Delete a note',
  parameters: z.object({
    noteId: z.string().describe('ID of the note to delete'),
    userId: z.string().describe('ID of the user deleting the note'),
  }),
  async execute(args: { noteId: string; userId: string }) {
    const note = await notesService.delete(args.noteId, args.userId)

    return {
      message: `Deleted note ${args.noteId}`,
      note,
    }
  },
})
