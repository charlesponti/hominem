import { router } from '../trpc'
import { bookmarksRouter } from '../trpc/routers/bookmarks.js'
import { chatRouter } from '../trpc/routers/chat'
import { contentRouter } from '../trpc/routers/content'
import { contentStrategiesRouter } from '../trpc/routers/content-strategies'
import { goalsRouter } from '../trpc/routers/goals'
import { locationRouter } from '../trpc/routers/location'
import { notesRouter } from '../trpc/routers/notes'
import { placesRouter } from '../trpc/routers/places'
import { tweetRouter } from '../trpc/routers/tweet'
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
  places: placesRouter,
  location: locationRouter,
  content: contentRouter,
  tweet: tweetRouter,
})

export type AppRouter = typeof appRouter
