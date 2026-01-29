/**
 * Computed Possession Types
 *
 * This file contains all derived types computed from the Possession schema.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from possessions.schema.ts
 */

import type { Possession, PossessionInsert } from './possessions.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** Possession as retrieved from database */
export type PossessionOutput = Possession;

/** Possession insert input (for creating possessions) */
export type PossessionInput = PossessionInsert;

// Legacy aliases
export type PossessionSelect = Possession;
