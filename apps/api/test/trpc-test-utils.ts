import type { UserSelect } from "@hominem/data/schema";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { Hono } from "hono";
import type { AppEnv } from "../src/server";
import type { AppRouter } from "../src/trpc";

/**
 * Creates a tRPC test client that works with the existing test infrastructure
 * Uses x-user-id header for authentication in test mode
 */
export const createTRPCTestClient = (server: Hono<AppEnv>, userId: string) => {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost/trpc",
        fetch: async (url, options) => {
          // Create a mock request to the server
          const request = new Request(url, {
            ...options,
            headers: {
              ...options?.headers,
              "x-user-id": userId,
              // Don't set authorization header - let the test middleware handle auth
            },
          });

          return server.fetch(request);
        },
      }),
    ],
  });
};

/**
 * Creates a tRPC test client with custom context
 */
export const createTRPCTestClientWithContext = (
  server: Hono<AppEnv>,
  context: { userId: string; user?: UserSelect }
) => {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost/trpc",
        fetch: async (url, options) => {
          const request = new Request(url, {
            ...options,
            headers: {
              ...options?.headers,
              "x-user-id": context.userId,
            },
          });

          return server.fetch(request);
        },
      }),
    ],
  });
};
