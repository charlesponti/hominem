/**
 * Computed Career Types
 *
 * This file contains all derived types computed from Career schemas.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from career.schema.ts
 */

import type { Job, JobInsert, JobApplication, JobApplicationInsert, ApplicationStage, ApplicationStageInsert, WorkExperience, WorkExperienceInsert } from './career.schema';

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

// ============================================
// APPLICATION STAGE TYPES
// ============================================

export type ApplicationStageOutput = ApplicationStage;
export type ApplicationStageInput = ApplicationStageInsert;

// ============================================
// WORK EXPERIENCE TYPES
// ============================================

export type WorkExperienceOutput = WorkExperience;
export type WorkExperienceInput = WorkExperienceInsert;

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  jobs,
  jobsRelations,
  job_applications,
  job_applicationsRelations,
  application_stages,
  application_stagesRelations,
  work_experiences,
  work_experiencesRelations,
} from './career.schema';
