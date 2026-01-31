/**
 * Computed Skill Types
 *
 * This file contains all derived types computed from the Skill schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from skills.schema.ts
 */

import type {
  Skill,
  SkillInsert,
  SkillSelect,
  NewSkill,
  UserSkill,
  UserSkillInsert,
  UserSkillSelect,
  NewUserSkill,
  JobSkill,
  JobSkillInsert,
  JobSkillSelect,
  NewJobSkill,
} from './skills.schema';

export type {
  Skill,
  SkillInsert,
  SkillSelect,
  NewSkill,
  UserSkill,
  UserSkillInsert,
  UserSkillSelect,
  NewUserSkill,
  JobSkill,
  JobSkillInsert,
  JobSkillSelect,
  NewJobSkill,
};

// Legacy aliases for backward compatibility
export type SkillOutput = Skill;
export type SkillInput = SkillInsert;

export type UserSkillOutput = UserSkill;
export type UserSkillInput = UserSkillInsert;

export type JobSkillOutput = JobSkill;
export type JobSkillInput = JobSkillInsert;
