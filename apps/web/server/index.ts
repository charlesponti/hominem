import { performancesRouter } from "./routes";
import { usersRouter } from "./routes/users";
import { router } from "./trpc";

export const appRouter = router({
  performances: performancesRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
