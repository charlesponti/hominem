import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import { router } from './procedures';
import { bookmarksRouter } from './routers/bookmarks';
import { chatsRouter } from './routers/chats';
import { contentRouter } from './routers/content';
import { contentStrategiesRouter } from './routers/content-strategies';
import { eventsRouter } from './routers/events';
import { filesRouter } from './routers/files';
import { financeRouter } from './routers/finance/finance.trpc';
import { goalsRouter } from './routers/goals';
import { locationRouter } from './routers/location';
import { messagesRouter } from './routers/messages';
import { notesRouter } from './routers/notes';
import { peopleRouter } from './routers/people';
import { searchRouter } from './routers/search';
import { tweetRouter } from './routers/tweet';
import { twitterRouter } from './routers/twitter';
import { userRouter } from './routers/user';
import { vectorRouter } from './routers/vector';

export const appRouter = router({
  user: userRouter,
  vector: vectorRouter,
  twitter: twitterRouter,
  tweet: tweetRouter,
  search: searchRouter,
  notes: notesRouter,
  messages: messagesRouter,
  location: locationRouter,
  goals: goalsRouter,
  events: eventsRouter,
  finance: financeRouter,
  files: filesRouter,
  content: contentRouter,
  contentStrategies: contentStrategiesRouter,
  chats: chatsRouter,
  bookmarks: bookmarksRouter,
  people: peopleRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Type helpers for full app router
 * Use only for internal tRPC infrastructure code
 */
export type AppRouterInputs = inferRouterInputs<AppRouter>;
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * Finance router type helpers
 * Use in finance apps for better type performance
 * This prevents TypeScript from inferring types for unrelated routers
 */
export type FinanceRouterInputs = inferRouterInputs<typeof financeRouter>;
export type FinanceRouterOutputs = inferRouterOutputs<typeof financeRouter>;

/**
 * Notes router type helpers
 */
export type NotesRouterInputs = inferRouterInputs<typeof notesRouter>;
export type NotesRouterOutputs = inferRouterOutputs<typeof notesRouter>;

/**
 * Chats router type helpers
 */
export type ChatsRouterInputs = inferRouterInputs<typeof chatsRouter>;
export type ChatsRouterOutputs = inferRouterOutputs<typeof chatsRouter>;
