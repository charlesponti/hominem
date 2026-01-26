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
 *
 * PERFORMANCE NOTE: This type inference is expensive (15+ seconds).
 * Only imported by code that actually needs it (hono-client, typed-routes).
 */
export type AppType = typeof app;

// Re-export for backward compatibility
export type { app };
