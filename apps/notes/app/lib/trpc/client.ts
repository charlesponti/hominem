import type { NotesRouterInputs, NotesRouterOutputs, AppRouter } from '@hominem/trpc';

import { createTRPCReact } from '@trpc/react-query';

/**
 * Use notes-specific types for better type checking performance
 * This prevents TypeScript from inferring types for unrelated routers
 * (finance, chats, etc.) which can significantly slow down IDE responsiveness
 */
export type RouterInput = NotesRouterInputs;
export type RouterOutput = NotesRouterOutputs;

export const trpc = createTRPCReact<AppRouter>();
