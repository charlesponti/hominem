/**
 * Hono RPC Client Setup for Rocco App
 *
 * Re-exports Hono client utilities for use throughout the app
 */

export { HonoProvider } from './provider';
export { useHonoClient, useHonoUtils, useHonoQuery, useHonoMutation } from '@hominem/hono-client';

// Re-export all hooks
export * from '../hooks/use-lists';
export * from '../hooks/use-places';
export * from '../hooks/use-invites';
export * from '../hooks/use-items';
export * from '../hooks/use-trips';
export * from '../hooks/use-people';
export * from '../hooks/use-user';

// Re-export types
export type * from '@hominem/hono-rpc/types';
