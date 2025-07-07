import { router } from '../trpc/index.js'
import { bookmarksRouter } from '../trpc/routers/bookmarks.js'
import { chatsRouter } from '../trpc/routers/chats.js'
import { contentRouter } from '../trpc/routers/content.js'
import { contentStrategiesRouter } from '../trpc/routers/content-strategies.js'
import { filesRouter } from '../trpc/routers/files.js'
import { financeRouter } from '../trpc/routers/finance/finance.trpc.js'
import { goalsRouter } from '../trpc/routers/goals.js'
import { locationRouter } from '../trpc/routers/location.js'
import { messagesRouter } from '../trpc/routers/messages.js'
import { notesRouter } from '../trpc/routers/notes.js'
import { performanceRouter } from '../trpc/routers/performance.js'
import { placesRouter } from '../trpc/routers/places.js'
import { searchRouter } from '../trpc/routers/search.js'
import { tweetRouter } from '../trpc/routers/tweet.js'
import { twitterRouter } from '../trpc/routers/twitter.js'
import { userRouter } from '../trpc/routers/user.js'
import { vectorRouter } from '../trpc/routers/vector.js'

export const appRouter = router({
  bookmarks: bookmarksRouter,
  chats: chatsRouter,
  contentStrategies: contentStrategiesRouter,
  content: contentRouter,
  files: filesRouter,
  finance: financeRouter,
  goals: goalsRouter,
  location: locationRouter,
  messages: messagesRouter,
  notes: notesRouter,
  performance: performanceRouter,
  places: placesRouter,

  search: searchRouter,
  tweet: tweetRouter,
  twitter: twitterRouter,
  user: userRouter,
  vector: vectorRouter,
})

export type AppRouter = typeof appRouter
