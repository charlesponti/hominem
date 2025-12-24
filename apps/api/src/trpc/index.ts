import { router } from "./procedures";
import { bookmarksRouter } from "./routers/bookmarks";
import { chatsRouter } from "./routers/chats";
import { contentRouter } from "./routers/content";
import { contentStrategiesRouter } from "./routers/content-strategies";
import { filesRouter } from "./routers/files";
import { financeRouter } from "./routers/finance/finance.trpc";
import { goalsRouter } from "./routers/goals";
import { eventsRouter } from "./routers/events";
import { locationRouter } from "./routers/location";
import { messagesRouter } from "./routers/messages";
import { notesRouter } from "./routers/notes";
import { performanceRouter } from "./routers/performance";
import { searchRouter } from "./routers/search";
import { tweetRouter } from "./routers/tweet";
import { twitterRouter } from "./routers/twitter";
import { userRouter } from "./routers/user";
import { vectorRouter } from "./routers/vector";

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
  events: eventsRouter,
  finance: financeRouter,
  files: filesRouter,
  content: contentRouter,
  contentStrategies: contentStrategiesRouter,
  chats: chatsRouter,
  bookmarks: bookmarksRouter,
});

export type AppRouter = typeof appRouter;
