/**
 * Computed Career Types
 *
 * This file contains all derived types computed from Career schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from career.schema.ts
 */

import type {
  ApplicationStage,
  ApplicationStageInsert,
  ApplicationStageSelect,
  Job,
  JobInsert,
  JobSelect,
  JobApplication,
  JobApplicationInsert,
  JobApplicationSelect,
  WorkExperience,
  WorkExperienceInsert,
  WorkExperienceSelect,
  NewJob,
  NewApplicationStage,
  NewWorkExperience,
} from './career.schema';

export type {
  ApplicationStage,
  ApplicationStageInsert,
  ApplicationStageSelect,
  Job,
  JobInsert,
  JobSelect,
  JobApplication,
  JobApplicationInsert,
  JobApplicationSelect,
  WorkExperience,
  WorkExperienceInsert,
  WorkExperienceSelect,
  NewJob,
  NewApplicationStage,
  NewWorkExperience,
};

// Legacy aliases for backward compatibility
export type JobOutput = Job;
export type JobInput = JobInsert;
export type JobApplicationOutput = JobApplication;
export type JobApplicationInput = JobApplicationInsert;
export type ApplicationStageOutput = ApplicationStage;
export type ApplicationStageInput = ApplicationStageInsert;
export type WorkExperienceOutput = WorkExperience;
export type WorkExperienceInput = WorkExperienceInsert;
