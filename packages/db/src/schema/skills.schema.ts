import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
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
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  // Removed redundant uniqueIndex for name as .unique() handles it
);

export const SkillInsertSchema = createInsertSchema(skills, {
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const SkillSelectSchema = createSelectSchema(skills, {
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SkillInsertSchemaType = z.infer<typeof SkillInsertSchema>;
export type SkillSelectSchemaType = z.infer<typeof SkillSelectSchema>;
export type Skill = SkillSelectSchemaType;
export type SkillInsert = SkillInsertSchemaType;
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
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('user_skill_unique_idx').on(table.userId, table.skillId),
    index('user_skill_user_id_idx').on(table.userId),
    index('user_skill_skill_id_idx').on(table.skillId),
  ],
);

export const UserSkillInsertSchema = createInsertSchema(user_skills, {
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUsedDate: z.date().nullable(),
});
export const UserSkillSelectSchema = createSelectSchema(user_skills, {
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUsedDate: z.date().nullable(),
});
export type UserSkillInsertSchemaType = z.infer<typeof UserSkillInsertSchema>;
export type UserSkillSelectSchemaType = z.infer<typeof UserSkillSelectSchema>;
export type UserSkill = UserSkillSelectSchemaType;
export type UserSkillInsert = UserSkillInsertSchemaType;
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
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('job_skill_unique_idx').on(table.jobId, table.skillId),
    index('job_skill_job_id_idx').on(table.jobId),
    index('job_skill_skill_id_idx').on(table.skillId),
  ],
);

export const JobSkillInsertSchema = createInsertSchema(job_skills);
export const JobSkillSelectSchema = createSelectSchema(job_skills);
export type JobSkillInsertSchemaType = z.infer<typeof JobSkillInsertSchema>;
export type JobSkillSelectSchemaType = z.infer<typeof JobSkillSelectSchema>;
export type JobSkill = JobSkillSelectSchemaType;
export type JobSkillInsert = JobSkillInsertSchemaType;
export type JobSkillSelect = JobSkill;
export type NewJobSkill = JobSkillInsert;
