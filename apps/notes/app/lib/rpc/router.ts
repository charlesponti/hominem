// Deprecated / Compatibility shim
// The old local RPC router has been removed in favor of Hono RPC. Provide a small
// stub so files that import `AppRouter` don't break during migration.

export const appRouter = {} as const;

export type AppRouter = typeof appRouter;
