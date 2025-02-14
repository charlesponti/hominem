import { publicProcedure, router } from "../trpc";
import { jobApplicationsRouter } from "./job-applications.router";

export const helloRouter = router({
	hello: publicProcedure.query(({ ctx }) => {
		return `Hello, ${ctx.auth?.userId ?? "world"}!`;
	}),
	jobApplications: jobApplicationsRouter,
});
