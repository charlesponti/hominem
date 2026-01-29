/**
 * Computed Skill Types
 */

import type { Skill, SkillInsert, UserSkill, UserSkillInsert, JobSkill, JobSkillInsert } from './skills.schema';

export type SkillOutput = Skill;
export type SkillInput = SkillInsert;

export type UserSkillOutput = UserSkill;
export type UserSkillInput = UserSkillInsert;

export type JobSkillOutput = JobSkill;
export type JobSkillInput = JobSkillInsert;

export { skills, user_skills, job_skills } from './skills.schema';
