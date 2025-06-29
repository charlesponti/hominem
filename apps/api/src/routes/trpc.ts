import { router } from '../trpc'
import { bookmarksRouter } from '../trpc/routers/bookmarks.js'
import { chatRouter } from '../trpc/routers/chat'
import { contentStrategiesRouter } from '../trpc/routers/content-strategies'
import { goalsRouter } from '../trpc/routers/goals'
import { notesRouter } from '../trpc/routers/notes'
import { twitterRouter } from '../trpc/routers/twitter'
import { vectorRouter } from '../trpc/routers/vector.js'
import { financeRouter } from './finance/finance.trpc.js'

export const appRouter = router({
  goals: goalsRouter,
  finance: financeRouter,
  vector: vectorRouter,
  bookmarks: bookmarksRouter,
  chat: chatRouter,
  notes: notesRouter,
  contentStrategies: contentStrategiesRouter,
  twitter: twitterRouter,
})

export type AppRouter = typeof appRouter
