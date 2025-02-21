import { applicationsRouter } from "./routers/applications";
import { helloRouter } from "./routes";
import { surveysRouter } from "./routes/surveys.router";
import { router } from "./trpc";

export const appRouter = router({
	hello: helloRouter,
	surveys: surveysRouter,
	applications: applicationsRouter,
});

export type AppRouter = typeof appRouter;
