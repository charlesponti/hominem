import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { companies } from './company.schema';
import { users } from './users.schema';

export const jobApplicationStatusEnum = pgEnum('job_application_status', [
  'Applied',
  'Hired',
  'Withdrew',
  'Rejected',
  'Offer',
  'Screening',
  'Interviewing',
  'Pending',
]);

export const jobPostingStatusEnum = pgEnum('job_posting_status', [
  // Enum for job posting status
  'draft',
  'open',
  'closed',
  'filled',
  'archived',
]);

export const applicationStageNameEnum = pgEnum('application_stage_name', [
  // Enum for application stage names
  'Applied',
  'Screening',
  'Assessment',
  'Interview',
  'TechnicalTest',
  'Offer',
  'Hired',
  'Rejected',
  'Withdrew',
  'OnHold',
]);

export const applicationStageStatusEnum = pgEnum('application_stage_status', [
  // Enum for application stage statuses
  'Pending',
  'Scheduled',
  'InProgress',
  'Completed',
  'Skipped',
  'Failed',
  'Passed',
]);

export enum JobApplicationStatus {
  APPLIED = 'Applied',
  HIRED = 'Hired',
  WITHDREW = 'Withdrew',
  REJECTED = 'Rejected',
  OFFER = 'Offer',
}

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the job posting
  companyId: uuid('company_id').references(() => companies.id), // Foreign key to the company that posted the job
  title: text('title').notNull(), // Job title
  description: text('description').notNull(), // Detailed description of the job
  requirements: json('requirements').notNull().default([]), // Job requirements (e.g., skills, experience) stored as JSON
  salary: text('salary').notNull(), // Salary information
  currency: text('currency').notNull().default('USD'), // Currency for the salary (default to USD)
  benefits: json('benefits').$type<string[]>().default([]), // Benefits offered (e.g., health insurance, retirement plans) stored as JSON
  location: text('location').notNull(), // Job location details (e.g., city, state, remote) stored as JSON
  status: jobPostingStatusEnum('status').notNull().default('draft'), // Current status of the job posting (using pgEnum)
  createdAt: createdAtColumn(), // Timestamp of when the job posting was created
  updatedAt: updatedAtColumn(), // Timestamp of when the job posting was last updated
  version: integer('version').notNull().default(1), // Version number for tracking changes to the job posting
});

export const JobInsertSchema = createInsertSchema(jobs, {
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const JobSelectSchema = createSelectSchema(jobs, {
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JobInsertSchemaType = z.infer<typeof JobInsertSchema>;
export type JobSelectSchemaType = z.infer<typeof JobSelectSchema>;
export type Job = JobSelectSchemaType;
export type JobInsert = JobInsertSchemaType;
export type JobSelect = Job;
export type NewJob = JobInsert;

export const job_applications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the job application
  position: text('position').notNull(), // Position applied for
  resumeDocumentUrl: text('resume_document_url').notNull(),
  coverLetterDocumentUrl: text('cover_letter_document_url'),
  startDate: timestamp('start_date').notNull().defaultNow(), // Date the application was started/submitted
  endDate: timestamp('end_date'), // Date the application process concluded (if applicable)
  link: text('link'), // Link to the job posting or application portal
  location: text('location').notNull().default('Remote'), // Location of the job applied for
  hasReference: boolean('has_reference').notNull().default(false), // Indicates if a reference was provided or required
  status: jobApplicationStatusEnum('status').notNull().default(JobApplicationStatus.APPLIED),
  salaryQuoted: text('salary_quoted'), // Salary quoted by the applicant or company
  salaryAccepted: text('salary_accepted'), // Salary accepted by the applicant (if offer made)
  jobPosting: text('job_posting'), // Raw text or link to the original job posting content
  phoneScreen: text('phone_screen'), // Notes or details about the phone screening stage
  notes: text('notes'), // General notes about the job application

  // Relationships
  companyId: uuid('company_id') // Foreign key to the company the application is for
    .notNull()
    .references(() => companies.id, { onDelete: 'set null' }),
  userId: uuid('user_id') // Foreign key to the user who submitted the application
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').references(() => jobs.id), // Foreign key to the specific job posting (if available)

  // Metadata
  createdAt: createdAtColumn(), // Timestamp of when the application record was created
  updatedAt: updatedAtColumn(), // Timestamp of when the application record was last updated
  },
  (table) => [
    index('job_applications_company_id_idx').on(table.companyId),
    index('job_applications_job_id_idx').on(table.jobId),
    index('job_applications_user_id_idx').on(table.userId),
  ],
);

export const JobApplicationInsertSchema = createInsertSchema(job_applications, {
  createdAt: z.string(),
  updatedAt: z.string(),
  startDate: z.date(),
  endDate: z.date().nullable(),
});
export const JobApplicationSelectSchema = createSelectSchema(job_applications, {
  createdAt: z.string(),
  updatedAt: z.string(),
  startDate: z.date(),
  endDate: z.date().nullable(),
});
export type JobApplicationInsertSchemaType = z.infer<typeof JobApplicationInsertSchema>;
export type JobApplicationSelectSchemaType = z.infer<typeof JobApplicationSelectSchema>;
export type JobApplication = JobApplicationSelectSchemaType;
export type JobApplicationInsert = JobApplicationInsertSchemaType;
export type JobApplicationSelect = JobApplication;

export const application_stages = pgTable(
  'application_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the application stage
    jobApplicationId: uuid('job_application_id') // Foreign key to the job application this stage belongs to
      .notNull()
      .references(() => job_applications.id, { onDelete: 'cascade' }),
    stage: applicationStageNameEnum('stage').notNull(), // Name of the application stage (using pgEnum)
    date: timestamp('date').notNull().defaultNow(), // Date this stage occurred or was scheduled
    notes: text('notes'), // Notes specific to this application stage
    status: applicationStageStatusEnum('status'), // Status of this stage (using pgEnum)
    createdAt: createdAtColumn(), // Timestamp of when this stage record was created
    updatedAt: updatedAtColumn(), // Timestamp of when this stage record was last updated
  },
  (table) => [
    index('app_stage_job_app_id_idx').on(table.jobApplicationId),
  ],
);

export const ApplicationStageInsertSchema = createInsertSchema(application_stages, {
  createdAt: z.string(),
  updatedAt: z.string(),
  date: z.date(),
});
export const ApplicationStageSelectSchema = createSelectSchema(application_stages, {
  createdAt: z.string(),
  updatedAt: z.string(),
  date: z.date(),
});
export type ApplicationStageInsertSchemaType = z.infer<typeof ApplicationStageInsertSchema>;
export type ApplicationStageSelectSchemaType = z.infer<typeof ApplicationStageSelectSchema>;
export type ApplicationStage = ApplicationStageSelectSchemaType;
export type ApplicationStageInsert = ApplicationStageInsertSchemaType;
export type ApplicationStageSelect = ApplicationStage;
export type NewApplicationStage = ApplicationStageInsert;

export const work_experiences = pgTable(
  'work_experiences',
  {
    id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the work experience
    userId: uuid('user_id') // Foreign key to the user this experience belongs to
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }), // Foreign key to the company
    title: text('title').notNull(), // Job title or position
    subtitle: text('subtitle'), // Subtitle or secondary title (e.g., department, project)
    description: text('description').notNull(), // Description of responsibilities and accomplishments
    role: text('role').notNull(), // Role held during this experience
    startDate: timestamp('start_date'), // Start date of the work experience
    endDate: timestamp('end_date'), // End date of the work experience (null if current)
    image: text('image'), // URL or path to an image representing the company or role
    location: text('location'), // Location of the work experience
    tags: json('tags').$type<string[]>().default([]), // Tags associated with the experience (e.g., skills, technologies)
    achievements: json('achievements').$type<string[]>().default([]), // List of key achievements (changed from text to json)
    metadata: json('metadata').$type<{
      // Additional structured metadata
      company_size?: string;
      industry?: string;
      website?: string;
    }>(),
    sortOrder: integer('sort_order').default(0).notNull(), // Order for displaying experiences
    isVisible: boolean('is_visible').default(true).notNull(), // Whether this experience is visible on a profile
    createdAt: createdAtColumn(), // Timestamp of creation
    updatedAt: updatedAtColumn(), // Timestamp of last update
  },
  (table) => [
    index('work_exp_user_id_idx').on(table.userId),
    index('work_exp_company_id_idx').on(table.companyId),
    index('work_exp_sort_order_idx').on(table.sortOrder), // Added index for sortOrder
    index('work_exp_visible_idx').on(table.isVisible),
    index('work_exp_created_at_idx').on(table.createdAt),
    index('work_exp_user_visible_idx').on(table.userId, table.isVisible),
    index('work_exp_user_sort_idx').on(table.userId, table.sortOrder), // Added composite index for user and sortOrder
  ],
);

export const WorkExperienceInsertSchema = createInsertSchema(work_experiences, {
  createdAt: z.string(),
  updatedAt: z.string(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
});
export const WorkExperienceSelectSchema = createSelectSchema(work_experiences, {
  createdAt: z.string(),
  updatedAt: z.string(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
});
export type WorkExperienceInsertSchemaType = z.infer<typeof WorkExperienceInsertSchema>;
export type WorkExperienceSelectSchemaType = z.infer<typeof WorkExperienceSelectSchema>;
export type WorkExperience = WorkExperienceSelectSchemaType;
export type WorkExperienceInsert = WorkExperienceInsertSchemaType;
export type WorkExperienceSelect = WorkExperience;
export type NewWorkExperience = WorkExperienceInsert;
