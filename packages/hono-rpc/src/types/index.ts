/**
 * Centralized Type Exports
 *
 * All types are organized by domain and re-exported here for convenience.
 *
 * Input types are derived from Zod schemas (ensuring sync with validation).
 * Output types are inferred from route handlers (ensuring sync with API).
 */

// ============================================================================
// Utilities
// ============================================================================

export * from './utils';
// export * from './errors';

// ============================================================================
// Domain Types
// ============================================================================

export * from './admin.types';
export * from './finance.types';
export * from './invites.types';
export * from './items.types';
export * from './lists.types';
export * from './people.types';
export * from './places.types';
export * from './trips.types';
export * from './user.types';
export * from './chat.types';
export * from './twitter.types';
export * from './notes.types';
export * from './events.types';
export * from './tweet.types';
export * from './goals.types';

// TODO: Add other domains as they are refactored
// export * from './bookmarks.types';
// export * from './chats.types';
