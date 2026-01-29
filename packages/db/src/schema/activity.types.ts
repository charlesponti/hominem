/**
 * Computed Activity Types
 *
 * This file contains all derived types computed from the Activity schema.
 */

import type { Activity, ActivityInsert } from './activity.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** Activity record as retrieved from database */
export type ActivityOutput = Activity;

/** Activity insert input */
export type ActivityInput = ActivityInsert;

// Legacy aliases
export type ActivitySelect = Activity;

// ============================================
// RE-EXPORT DRIZZLE TABLES
// ============================================

export { activities } from './activity.schema';
