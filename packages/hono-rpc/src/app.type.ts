/**
 * app.type.ts
 *
 * Separated type file for AppType inference.
 * This file is only loaded when explicitly imported, preventing
 * the expensive type computation from blocking other type checks.
 *
 * Import this only where AppType is needed (clients, typed routes).
 */

import type { app } from './app';

/**
 * AppType - Type representing the entire API structure
 *
 * Used for type-safe client instantiation and response type inference.
 * This type captures the complete API shape including all routes and methods.
 * NOTE: This type is expensive to compute; import sparingly.
 */
export type AppType = typeof app;
