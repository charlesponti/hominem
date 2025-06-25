import { router } from '../trpc'
import { goalsRouter } from '../trpc/routers/goals'
import { vectorRouter } from '../trpc/routers/vector.js'
import { financeRouter } from './finance/finance.trpc.js'

export const appRouter = router({
  goals: goalsRouter,
  finance: financeRouter,
  vector: vectorRouter,
})

export type AppRouter = typeof appRouter
