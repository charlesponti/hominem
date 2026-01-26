/**
 * types-only.ts
 *
 * This module provides type-safe access to AppType and route types
 * WITHOUT importing the entire app.ts file.
 *
 * Use this in applications that need types but not the app runtime.
 */

// Re-export types from dedicated type files
export type { AppType } from './app.type';
export * from './types';
