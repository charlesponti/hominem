import { applicationsRouter } from './routers/applications'
import { companyRouter } from './routers/company.router'
import { healthRouter } from './routers/health.router'
import { notesRouter } from './routers/notes.router'
import { surveysRouter } from './routers/surveys.router'
import { router } from './trpc'

export const appRouter = router({
  surveys: surveysRouter,
  applications: applicationsRouter,
  company: companyRouter,
  notes: notesRouter,
  health: healthRouter,
})

export type AppRouter = typeof appRouter
