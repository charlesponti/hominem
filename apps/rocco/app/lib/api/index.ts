/**
 * API Client Setup for Rocco App
 *
 * Exports API client utilities for use throughout the app
 */

export { HonoProvider } from './provider';
export {
  useHonoClient,
  useHonoUtils,
  useHonoQuery,
  useHonoMutation,
} from '@hominem/hono-client/react';
