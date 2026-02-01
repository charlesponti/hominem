/**
 * Hono RPC Client Setup for Notes App
 *
 * Re-exports Hono client utilities for use throughout the app
 */

export { HonoProvider } from './provider';
export {
  useHonoClient,
  useHonoUtils,
  useHonoQuery,
  useHonoMutation,
} from '@hominem/hono-client/react';

// Re-export types
export type * from '@hominem/hono-rpc/types';
