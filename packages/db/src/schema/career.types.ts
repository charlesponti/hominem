/**
 * Computed Career Types
 *
 * This file contains all derived types computed from Career schemas.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from career.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import {
  jobs,
  job_applications,
  application_stages,
  work_experiences,
} from './career.schema'

// Inferred types from Drizzle schema
export type Job = InferSelectModel<typeof jobs>
export type JobInsert = InferInsertModel<typeof jobs>
export type JobApplication = InferSelectModel<typeof job_applications>
export type JobApplicationInsert = InferInsertModel<typeof job_applications>
export type ApplicationStage = InferSelectModel<typeof application_stages>
export type ApplicationStageInsert = InferInsertModel<typeof application_stages>
export type WorkExperience = InferSelectModel<typeof work_experiences>
export type WorkExperienceInsert = InferInsertModel<typeof work_experiences>

// Legacy aliases for backward compatibility
export type JobOutput = Job
export type JobInput = JobInsert

export type JobApplicationOutput = JobApplication
export type JobApplicationInput = JobApplicationInsert

export type ApplicationStageOutput = ApplicationStage
export type ApplicationStageInput = ApplicationStageInsert

export type WorkExperienceOutput = WorkExperience
export type WorkExperienceInput = WorkExperienceInsert

// Re-export tables for convenience
export {
  jobs,
  jobsRelations,
  job_applications,
  job_applicationsRelations,
  application_stages,
  application_stagesRelations,
  work_experiences,
  work_experiencesRelations,
} from './career.schema'
