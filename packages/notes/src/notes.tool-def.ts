import { toolDefinition } from '@tanstack/ai'
import { CreateNoteInputSchema, ListNotesInputSchema, ListNotesOutputSchema, NoteOutputSchema, notesService } from './notes.service'
import { z } from 'zod'

export const createNoteDef = toolDefinition({
  name: 'create_note',
  description: 'Create a new note with a title and content',
  inputSchema: CreateNoteInputSchema,
  outputSchema: NoteOutputSchema,
})

export const createNoteServer = async (input: unknown) => {
  const args = input as z.infer<typeof CreateNoteInputSchema> & { userId?: string }
  return notesService.create({ ...args, userId: args.userId ?? '' })
}

export const listNotesDef = toolDefinition({
  name: 'list_notes',
  description: 'List all notes for the authenticated user',
  inputSchema: ListNotesInputSchema,
  outputSchema: ListNotesOutputSchema,
})

export const listNotesServer = async (input: unknown) => {
  const args = input as z.infer<typeof ListNotesInputSchema> & { userId?: string }
  const userId = args.userId ?? ''
  // Remove userId from filters before passing to service
  const { userId: _u, ...filters } = args as any
  return notesService.query(userId, filters)
}
