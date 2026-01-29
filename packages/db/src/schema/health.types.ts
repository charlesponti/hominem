/**
 * Computed Health Types
 *
 * This file contains all derived types computed from the Health schema.
 */

import type { Health, HealthInsert } from './health.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** Health record as retrieved from database */
export type HealthOutput = Health;

/** Health insert input */
export type HealthInput = HealthInsert;

// Legacy aliases
export type HealthSelect = Health;

// ============================================
// RE-EXPORT DRIZZLE TABLES
// ============================================

export { health } from './health.schema';
