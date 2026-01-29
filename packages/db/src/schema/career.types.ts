/**
 * Computed Career Types
 *
 * This file contains all derived types computed from Career schemas.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from career.schema.ts
 */

import type { Job, JobInsert, JobApplication, JobApplicationInsert } from './career.schema';

// ============================================
// JOB TYPES
// ============================================

export type JobOutput = Job;
export type JobInput = JobInsert;

// ============================================
// JOB APPLICATION TYPES
// ============================================

export type JobApplicationOutput = JobApplication;
export type JobApplicationInput = JobApplicationInsert;
