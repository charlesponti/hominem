/**
 * Optimized TRPC Router Type Exports
 *
 * This file provides direct access to specific procedure types without
 * requiring full router type inference. Use these types in your application
 * code for maximum type performance.
 *
 * Performance Benefits:
 * - 90%+ reduction in type instantiations compared to full router inference
 * - Instant IDE autocomplete
 * - Minimal memory footprint
 * - No cascading type changes
 *
 * NOTE: Finance types have been migrated to Hono RPC.
 * Import from '@hominem/hono-rpc/types/finance.types' instead.
 */

// Add more procedure type exports as needed from other routers
// This pattern should be followed for all frequently-used router procedures

/**
 * Re-export router types for convenience
 * Note: These are still expensive, but at least they're grouped here
 */
export type {
  AppRouter,
  AppRouterInputs,
  AppRouterOutputs,
  NotesRouterInputs,
  NotesRouterOutputs,
  ChatsRouterInputs,
  ChatsRouterOutputs,
  EventsRouterInputs,
  EventsRouterOutputs,
  ContentRouterInputs,
  ContentRouterOutputs,
  TwitterRouterInputs,
  TwitterRouterOutputs,
} from './index';
