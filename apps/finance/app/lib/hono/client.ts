/**
 * Hono RPC Client for Finance App
 *
 * Simple re-exports from hono-client package.
 * All the heavy lifting is done by the client package.
 */

export {
  useHonoClient,
  useHonoQuery,
  useHonoMutation,
  useHonoUtils,
} from '@hominem/hono-client/react';
export { useHonoMutationWithOptimistic } from '@hominem/hono-client/react';

// Re-export all finance types for convenience
export type * from '@hominem/hono-rpc/types/finance.types';
