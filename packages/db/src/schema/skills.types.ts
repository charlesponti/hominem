/**
 * Computed Skill Types
 *
 * This file contains all derived types computed from Skill schema.
 * These types are inferred from Drizzle ORM schema definitions.
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { skills, user_skills, job_skills } from './skills.schema'

// Inferred types from Drizzle schema
export type Skill = InferSelectModel<typeof skills>
export type SkillInsert = InferInsertModel<typeof skills>
export type UserSkill = InferSelectModel<typeof user_skills>
export type UserSkillInsert = InferInsertModel<typeof user_skills>
export type JobSkill = InferSelectModel<typeof job_skills>
export type JobSkillInsert = InferInsertModel<typeof job_skills>

// Legacy aliases for backward compatibility
export type SkillOutput = Skill
export type SkillInput = SkillInsert

export type UserSkillOutput = UserSkill
export type UserSkillInput = UserSkillInsert

export type JobSkillOutput = JobSkill
export type JobSkillInput = JobSkillInsert

// Re-export tables for convenience
export { skills, user_skills, job_skills } from './skills.schema'
