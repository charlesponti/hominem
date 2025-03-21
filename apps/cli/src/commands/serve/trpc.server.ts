import { EmailMaskRouter } from './routers/email-mask.router'
import { FinanceRouter } from './routers/finance-router'
import { NotesRouter } from './routers/notes.router'
import { trpc } from './trpc'

// Create routers
const emailRouter = new EmailMaskRouter(process.env.emailDomain || 'example.com')
const notesRouter = new NotesRouter()
const financeRouter = new FinanceRouter()

// Merge routers
export const appRouter = trpc.router({
  email: emailRouter.router,
  notes: notesRouter.router,
  finance: financeRouter.router,
})
export type AppRouter = typeof appRouter
