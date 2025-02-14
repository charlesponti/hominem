import { router, publicProcedure } from "../trpc";

export const performancesRouter = router({
  hello: publicProcedure.query(({ ctx }) => {
    return `Hello, ${ctx.auth?.userId ?? "world"}!`;
  }),
});
