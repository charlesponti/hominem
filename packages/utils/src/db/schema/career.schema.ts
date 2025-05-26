import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { companies } from './company.schema'
import { users } from './users.schema'

const JobApplicationStageSchema = z.object({
  stage: z.string(),
  date: z.string(),
})
const JobApplicationStagesSchema = z.array(JobApplicationStageSchema)

export enum JobApplicationStatus {
  APPLIED = 'Applied',
  HIRED = 'Hired',
  WITHDREW = 'Withdrew',
  REJECTED = 'Rejected',
  OFFER = 'Offer',
}

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  requirements: jsonb('requirements').notNull().default([]),
  salary: jsonb('salary').notNull(),
  location: jsonb('location').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
})
export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert

export const job_applications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  position: text('position').notNull(),
  resume: text('resume'),
  coverLetter: text('cover_letter'),
  startDate: timestamp('start_date').notNull().defaultNow(),
  endDate: timestamp('end_date'),
  link: text('link'),
  location: text('location').notNull().default('Remote'),
  reference: boolean('reference').notNull().default(false),
  stages: jsonb('stages').notNull().$type<z.infer<typeof JobApplicationStagesSchema>>(),
  status: text('status').notNull().default(JobApplicationStatus.APPLIED),
  salaryQuoted: text('salary_quoted'),
  salaryAccepted: text('salary_accepted'),
  jobPosting: text('job_posting'),
  phoneScreen: text('phone_screen'),
  notes: text('notes'),

  // Relationships
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  jobId: uuid('job_id').references(() => jobs.id),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type JobApplicationInsert = typeof job_applications.$inferInsert
export type JobApplication = typeof job_applications.$inferSelect
