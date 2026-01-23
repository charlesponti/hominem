import type { FinanceRouterInputs, FinanceRouterOutputs, AppRouter } from '@hominem/trpc';

import { createTRPCReact } from '@trpc/react-query';

/**
 * Use finance-specific types for better type checking performance
 * This prevents TypeScript from inferring types for unrelated routers
 * (notes, chats, etc.) which can significantly slow down IDE responsiveness
 */
export type RouterInput = FinanceRouterInputs;
export type RouterOutput = FinanceRouterOutputs;

export const trpc = createTRPCReact<AppRouter>();
