/**
 * Computed Company Types
 *
 * This file contains all derived types computed from the Company schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from company.schema.ts
 */

import type { Company, CompanyInsert, CompanySelect, NewCompany } from './company.schema';

export type { Company, CompanyInsert, CompanySelect, NewCompany };

// Legacy aliases for backward compatibility
export type CompanyOutput = Company;
export type CompanyInput = CompanyInsert;
