import { router } from './context'
import { contentRouter, notesRouter } from './routers'

// Main router for notes app
export const appRouter = router({
  notes: notesRouter,
  content: contentRouter,
})

export type AppRouter = typeof appRouter



