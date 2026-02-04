/**
 * Hono RPC Client Setup for Rocco App
 *
 * Re-exports Hono client utilities for use throughout the app
 */

/**
 * Hono RPC Client Setup for Rocco App
 *
 * This file exports the HonoProvider and Hono client utilities.
 * For hooks, import directly from ~/lib/hooks/ or use the convenience
 * re-exports in ~/lib/lists.ts, ~/lib/places.ts, etc.
 */

export { HonoProvider } from './provider';
export {
  useHonoClient,
  useHonoUtils,
  useHonoQuery,
  useHonoMutation,
} from '@hominem/hono-client/react';

export { queryKeys } from '../query-keys';
