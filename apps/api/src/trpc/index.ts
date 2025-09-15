// Import tRPC procedures from separate file to avoid circular dependencies
import { type Context, protectedProcedure, publicProcedure, router } from './procedures.js'

// Import all sub-routers
import { bookmarksRouter } from './routers/bookmarks.js'
import { chatsRouter } from './routers/chats.js'
import { contentRouter } from './routers/content.js'
import { contentStrategiesRouter } from './routers/content-strategies.js'
import { filesRouter } from './routers/files.js'
import { financeRouter } from './routers/finance/finance.trpc.js'
import { goalsRouter } from './routers/goals.js'
import { locationRouter } from './routers/location.js'
import { messagesRouter } from './routers/messages.js'
import { notesRouter } from './routers/notes.js'
import { performanceRouter } from './routers/performance.js'
import { searchRouter } from './routers/search.js'
import { tweetRouter } from './routers/tweet.js'
import { twitterRouter } from './routers/twitter.js'
import { userRouter } from './routers/user.js'
import { vectorRouter } from './routers/vector.js'

// Re-export procedures for external use
export { router, publicProcedure, protectedProcedure, type Context }

// Create the main app router
export const appRouter = router({
  user: userRouter,
  vector: vectorRouter,
  twitter: twitterRouter,
  tweet: tweetRouter,
  search: searchRouter,
  performance: performanceRouter,
  notes: notesRouter,
  messages: messagesRouter,
  location: locationRouter,
  goals: goalsRouter,
  finance: financeRouter,
  files: filesRouter,
  content: contentRouter,
  contentStrategies: contentStrategiesRouter,
  chats: chatsRouter,
  bookmarks: bookmarksRouter,
})

export type AppRouter = typeof appRouter
