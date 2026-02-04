import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { jobs } from './career.schema';
import { users } from './users.schema';

export const skillCategoryEnum = pgEnum('skill_category', [
  'Technical',
  'Soft',
  'Language',
  'Tool',
  'Framework',
  'Other',
]);

export const skillProficiencyEnum = pgEnum('skill_proficiency', [
  // Enum for skill proficiency
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
]);

export const jobSkillImportanceEnum = pgEnum('job_skill_importance', [
  // Enum for job skill importance
  'Required',
  'Preferred',
  'Optional',
  'NiceToHave',
]);

export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(), // .unique() already creates a unique index
    description: text('description'),
    category: skillCategoryEnum('category'),
    // Potential for a self-referential relationship for related skills or skill hierarchy
    // parentSkillId: uuid('parent_skill_id').references((): AnyPgColumn => skills.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  // Removed redundant uniqueIndex for name as .unique() handles it
);

export type Skill = InferSelectModel<typeof skills>;
export type SkillInsert = InferInsertModel<typeof skills>;
export type SkillSelect = Skill;
export type NewSkill = SkillInsert;

export const user_skills = pgTable(
  'user_skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    proficiencyLevel: skillProficiencyEnum('proficiency_level'), // Using pgEnum
    yearsOfExperience: integer('years_of_experience'),
    lastUsedDate: timestamp('last_used_date'),
    isVerified: boolean('is_verified').default(false), // e.g., verified by a test or an employer
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_skill_unique_idx').on(table.userId, table.skillId),
    index('user_skill_user_id_idx').on(table.userId),
    index('user_skill_skill_id_idx').on(table.skillId),
  ],
);

export type UserSkill = InferSelectModel<typeof user_skills>;
export type UserSkillInsert = InferInsertModel<typeof user_skills>;
export type UserSkillSelect = UserSkill;
export type NewUserSkill = UserSkillInsert;

export const job_skills = pgTable(
  'job_skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }), // Assuming 'jobs' table exists in career.schema.ts
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    importanceLevel: jobSkillImportanceEnum('importance_level'), // Using pgEnum
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('job_skill_unique_idx').on(table.jobId, table.skillId),
    index('job_skill_job_id_idx').on(table.jobId),
    index('job_skill_skill_id_idx').on(table.skillId),
  ],
);

export type JobSkill = InferSelectModel<typeof job_skills>;
export type JobSkillInsert = InferInsertModel<typeof job_skills>;
export type JobSkillSelect = JobSkill;
export type NewJobSkill = JobSkillInsert;
