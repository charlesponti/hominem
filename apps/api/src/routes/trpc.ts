import { router } from '../trpc'
import { bookmarksRouter } from '../trpc/routers/bookmarks.js'
import { goalsRouter } from '../trpc/routers/goals'
import { vectorRouter } from '../trpc/routers/vector.js'
import { financeRouter } from './finance/finance.trpc.js'

export const appRouter = router({
  goals: goalsRouter,
  finance: financeRouter,
  vector: vectorRouter,
  bookmarks: bookmarksRouter,
})

export type AppRouter = typeof appRouter
