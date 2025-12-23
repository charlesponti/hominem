import { router } from './context'
import { adminRouter } from './routers/admin'
import { invitesRouter } from './routers/invites'
import { itemsRouter } from './routers/items'
import { listsRouter } from './routers/lists'
import { placesRouter } from './routers/places'
import { tripsRouter } from './routers/trips'
import { userRouter } from './routers/user'

export const appRouter = router({
  admin: adminRouter,
  lists: listsRouter,
  places: placesRouter,
  items: itemsRouter,
  invites: invitesRouter,
  trips: tripsRouter,
  user: userRouter,
})

export type AppRouter = typeof appRouter
