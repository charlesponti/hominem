/**
 * Barrel file for @hominem/hono-rpc types
 *
 * This file re-exports the public type definitions for the RPC surface so consumers
 * can import from '@hominem/hono-rpc/types'.
 *
 * Keep this list in sync with the files present in this directory. Prefer exporting
 * the top-level aggregates (e.g. `finance.types`) when they exist to avoid duplicate
 * exports across multiple modules.
 */

/* Core RPC type groups */
export * from './admin.types';
export * from './chat.types';
export * from './events.types';
export * from './finance.types';
export * from './goals.types';
export * from './invites.types';
export * from './items.types';
export * from './lists.types';
export * from './mobile.types';
export * from './notes.types';
export * from './people.types';
export * from './places.types';
export * from './trips.types';
export * from './tweet.types';
export * from './twitter.types';
export * from './user.types';

/* Utility types */
export * from './utils';
