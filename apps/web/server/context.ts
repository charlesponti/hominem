import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/data/postgres";
import { cache } from "react";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export const createContext = cache(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (opts: FetchCreateContextFnOptions) => {
    return {
      db,
      auth: await auth(),
    };
  }
);

export type Context = Awaited<ReturnType<typeof createContext>>;
