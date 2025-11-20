import { router } from './context'
import { lifeEventsRouter } from './routers'

export const appRouter = router({
  lifeEvents: lifeEventsRouter,
})

export type AppRouter = typeof appRouter
