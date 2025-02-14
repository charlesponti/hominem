import { auth } from "@clerk/nextjs/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { cache } from "react";

export const createContext = cache(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async (opts: FetchCreateContextFnOptions) => {
		return {
			auth: await auth(),
		};
	},
);

export type Context = Awaited<ReturnType<typeof createContext>>;
