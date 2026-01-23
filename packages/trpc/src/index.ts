import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import { router } from './procedures';
import { bookmarksRouter } from './routers/bookmarks';
import { chatsRouter } from './routers/chats';
import { contentRouter } from './routers/content';
import { contentStrategiesRouter } from './routers/content-strategies';
import { eventsRouter } from './routers/events';
import { filesRouter } from './routers/files';
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
  files: filesRouter,
  content: contentRouter,
  contentStrategies: contentStrategiesRouter,
  chats: chatsRouter,
  bookmarks: bookmarksRouter,
  people: peopleRouter,
});

export type AppRouter = typeof appRouter;

/**
 * ⚠️ PERFORMANCE WARNING: Full App Router Types
 *
 * These types infer across ALL 17 routers and can be expensive.
 * Use only for internal tRPC infrastructure code.
 *
 * For application code, use the specific router types below instead.
 * This reduces type instantiations by 80%+ and improves IDE performance.
 */
export type AppRouterInputs = inferRouterInputs<AppRouter>;
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * 🚀 OPTIMIZED: Per-Feature Router Types
 *
 * Use these in your application code instead of AppRouterInputs/Outputs.
 * Benefits:
 * - 80%+ reduction in type instantiations
 * - Faster IDE autocomplete
 * - Better type error messages
 * - Isolated type changes (changing notes router won't affect finance types)
 */

/**
 * Finance router migrated to Hono RPC
 * See: packages/hono-rpc/src/routes/finance.ts
 */

/**
 * Notes router type helpers
 * Use in notes apps for better type performance
 */
export type NotesRouterInputs = inferRouterInputs<typeof notesRouter>;
export type NotesRouterOutputs = inferRouterOutputs<typeof notesRouter>;

/**
 * Chats router type helpers
 * Use in chat apps for better type performance
 */
export type ChatsRouterInputs = inferRouterInputs<typeof chatsRouter>;
export type ChatsRouterOutputs = inferRouterOutputs<typeof chatsRouter>;

/**
 * Events router type helpers
 * Use in calendar/events apps for better type performance
 */
export type EventsRouterInputs = inferRouterInputs<typeof eventsRouter>;
export type EventsRouterOutputs = inferRouterOutputs<typeof eventsRouter>;

/**
 * Content router type helpers
 * Use in content management apps for better type performance
 */
export type ContentRouterInputs = inferRouterInputs<typeof contentRouter>;
export type ContentRouterOutputs = inferRouterOutputs<typeof contentRouter>;

/**
 * Twitter router type helpers
 * Use in social media apps for better type performance
 */
export type TwitterRouterInputs = inferRouterInputs<typeof twitterRouter>;
export type TwitterRouterOutputs = inferRouterOutputs<typeof twitterRouter>;
