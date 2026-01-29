/**
 * Computed Company Types
 *
 * This file contains all derived types computed from Company schema.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from company.schema.ts
 */

import type { Company, CompanyInsert } from './company.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

export type CompanyOutput = Company;
export type CompanyInput = CompanyInsert;

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export { companies } from './company.schema';
