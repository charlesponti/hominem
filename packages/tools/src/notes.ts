import {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  ListNotesOutputSchema,
  NoteOutputSchema,
} from '@hominem/services/notes'
import { toolDefinition } from '@tanstack/ai'

// Tool Definition 1: Create Note
export const createNoteDef = toolDefinition({
  name: 'create_note',
  description: 'Create a new note with a title and content',
  inputSchema: CreateNoteInputSchema,
  outputSchema: NoteOutputSchema,
})

// Tool Definition 2: List Notes
export const listNotesDef = toolDefinition({
  name: 'list_notes',
  description: 'List all notes for the authenticated user',
  inputSchema: ListNotesInputSchema,
  outputSchema: ListNotesOutputSchema,
})

export const createNoteInputSchema = CreateNoteInputSchema
export const createNoteOutputSchema = NoteOutputSchema
export const listNotesInputSchema = ListNotesInputSchema
export const listNotesOutputSchema = ListNotesOutputSchema
