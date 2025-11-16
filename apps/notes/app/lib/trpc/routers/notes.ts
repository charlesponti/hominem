import { createNotesRouter } from '@hominem/notes'
import { protectedProcedure, router } from '../context'

export const notesRouter = createNotesRouter(router, protectedProcedure)
