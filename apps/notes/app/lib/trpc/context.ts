import { initTRPC } from '@trpc/server';

export interface Context {
  request?: Request;
}

export async function createContext(request?: Request): Promise<Context> {
  return { request };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
