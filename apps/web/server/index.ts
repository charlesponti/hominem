import { helloRouter } from "./routes";
import { surveysRouter } from "./routes/surveys.router";
import { router } from "./trpc";

export const appRouter = router({
	hello: helloRouter,
	surveys: surveysRouter,
});

export type AppRouter = typeof appRouter;
