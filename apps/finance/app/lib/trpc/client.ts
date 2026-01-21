import type { AppRouter } from '@hominem/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import { createTRPCReact } from '@trpc/react-query';

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

export const trpc = createTRPCReact<AppRouter>();
