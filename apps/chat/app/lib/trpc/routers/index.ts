import { router } from '../../trpc'
import { chatsRouter } from './chats'
import { filesRouter } from './files'
import { metricsRouter } from './metrics'
import { searchRouter } from './search'

export const appRouter = router({
  chatOperations: chatsRouter,
  fileOperations: filesRouter,
  searchOperations: searchRouter,
  metricsOperations: metricsRouter,
})

export type AppRouter = typeof appRouter
