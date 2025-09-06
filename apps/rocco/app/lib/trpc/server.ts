import { QueryClient } from "@tanstack/react-query";
import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";
import { createContext } from "./context";
import { appRouter } from "./router";

// Create a stable getter for the query client that
// will return the same client during the same request.
export const getQueryClient = cache(() => {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 1000, // 5 seconds
			},
		},
	});
});

// Create a caller that can be used in server loaders
export const caller = appRouter.createCaller(createContext);

export const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
	caller,
	getQueryClient,
);
