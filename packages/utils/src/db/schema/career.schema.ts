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
} from 'drizzle-orm/pg-core'
import { companies } from './company.schema'
import { users } from './users.schema'

export const jobApplicationStatusEnum = pgEnum('job_application_status', [
  'Applied',
  'Hired',
  'Withdrew',
  'Rejected',
  'Offer',
  'Screening',
  'Interviewing',
  'Pending',
])

export const jobPostingStatusEnum = pgEnum('job_posting_status', [
  // Enum for job posting status
  'draft',
  'open',
  'closed',
  'filled',
  'archived',
])

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
])

export const applicationStageStatusEnum = pgEnum('application_stage_status', [
  // Enum for application stage statuses
  'Pending',
  'Scheduled',
  'InProgress',
  'Completed',
  'Skipped',
  'Failed',
  'Passed',
])

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
  createdAt: timestamp('created_at').notNull().defaultNow(), // Timestamp of when the job posting was created
  updatedAt: timestamp('updated_at').notNull().defaultNow(), // Timestamp of when the job posting was last updated
  version: integer('version').notNull().default(1), // Version number for tracking changes to the job posting
})
export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert

export const job_applications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the job application
  position: text('position').notNull(), // Position applied for
  resumeDocumentUrl: text('resume_document_url').notNull(),
  coverLetterDocumentUrl: text('cover_letter_document_url'),
  startDate: timestamp('start_date').notNull().defaultNow(), // Date the application was started/submitted
  endDate: timestamp('end_date'), // Date the application process concluded (if applicable)
  link: text('link'), // Link to the job posting or application portal
  location: text('location').notNull().default('Remote'), // Location of the job applied for
  reference: boolean('reference').notNull().default(false), // Indicates if a reference was provided or required
  status: jobApplicationStatusEnum('status').notNull().default(JobApplicationStatus.APPLIED),
  salaryQuoted: text('salary_quoted'), // Salary quoted by the applicant or company
  salaryAccepted: text('salary_accepted'), // Salary accepted by the applicant (if offer made)
  jobPosting: text('job_posting'), // Raw text or link to the original job posting content
  phoneScreen: text('phone_screen'), // Notes or details about the phone screening stage
  notes: text('notes'), // General notes about the job application

  // Relationships
  companyId: uuid('company_id') // Foreign key to the company the application is for
    .notNull()
    .references(() => companies.id),
  userId: uuid('user_id') // Foreign key to the user who submitted the application
    .notNull()
    .references(() => users.id),
  jobId: uuid('job_id').references(() => jobs.id), // Foreign key to the specific job posting (if available)

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(), // Timestamp of when the application record was created
  updatedAt: timestamp('updated_at').notNull().defaultNow(), // Timestamp of when the application record was last updated
})

export type JobApplicationInsert = typeof job_applications.$inferInsert
export type JobApplication = typeof job_applications.$inferSelect

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
    createdAt: timestamp('created_at').notNull().defaultNow(), // Timestamp of when this stage record was created
    updatedAt: timestamp('updated_at').notNull().defaultNow(), // Timestamp of when this stage record was last updated
  },
  (table) => ({
    jobApplicationIdIdx: index('app_stage_job_app_id_idx').on(table.jobApplicationId),
  })
)

export type ApplicationStage = typeof application_stages.$inferSelect
export type NewApplicationStage = typeof application_stages.$inferInsert

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
      company_size?: string
      industry?: string
      website?: string
    }>(),
    sortOrder: integer('sort_order').default(0).notNull(), // Order for displaying experiences
    isVisible: boolean('is_visible').default(true).notNull(), // Whether this experience is visible on a profile
    createdAt: timestamp('created_at').defaultNow().notNull(), // Timestamp of creation
    updatedAt: timestamp('updated_at').defaultNow().notNull(), // Timestamp of last update
  },
  (table) => [
    index('work_exp_user_id_idx').on(table.userId),
    index('work_exp_company_id_idx').on(table.companyId),
    index('work_exp_sort_order_idx').on(table.sortOrder), // Added index for sortOrder
    index('work_exp_visible_idx').on(table.isVisible),
    index('work_exp_created_at_idx').on(table.createdAt),
    index('work_exp_user_visible_idx').on(table.userId, table.isVisible),
    index('work_exp_user_sort_idx').on(table.userId, table.sortOrder), // Added composite index for user and sortOrder
  ]
)

export type WorkExperience = typeof work_experiences.$inferSelect
export type NewWorkExperience = typeof work_experiences.$inferInsert
