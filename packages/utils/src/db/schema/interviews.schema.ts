import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { job_applications } from './career.schema'
import { companies } from './company.schema'
import { contacts } from './contacts.schema' // For interviewers
import { users } from './users.schema'

export const interviewTypeEnum = pgEnum('interview_type', [
  'PhoneScreen',
  'Technical',
  'Behavioral',
  'Panel',
  'CaseStudy',
  'Final',
  'Informational',
  'Other',
])

export const interviewFormatEnum = pgEnum('interview_format', [
  'Phone',
  'VideoCall',
  'OnSite',
  'TakeHomeAssignment',
  'Other',
])

export const interviewStatusEnum = pgEnum('interview_status', [
  // Enum for interview status
  'Scheduled',
  'Completed',
  'Cancelled',
  'Rescheduled',
  'PendingFeedback',
])

export const interviews = pgTable(
  'interviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobApplicationId: uuid('job_application_id')
      .notNull()
      .references(() => job_applications.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }), // Denormalized for easier querying, but jobApplication already has companyId
    type: interviewTypeEnum('type').notNull(),
    format: interviewFormatEnum('format').notNull(),
    scheduledAt: timestamp('scheduled_at').notNull(),
    durationMinutes: integer('duration_minutes'),
    location: text('location'), // For on-site or specific video call link
    notes: text('notes'), // Pre-interview prep, post-interview reflections
    feedback: text('feedback'), // Feedback received, if any
    thankYouNoteSent: timestamp('thank_you_note_sent_at'),
    status: interviewStatusEnum('status'), // e.g., Scheduled, Completed, Cancelled, Rescheduled (using pgEnum)
    questionsAsked: jsonb('questions_asked'), // Store questions asked to the candidate
    questionsToAsk: jsonb('questions_to_ask'), // Store questions the candidate plans to ask
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('interview_user_id_idx').on(table.userId),
    jobApplicationIdx: index('interview_job_app_id_idx').on(table.jobApplicationId),
    companyIdx: index('interview_company_id_idx').on(table.companyId),
    scheduledAtIdx: index('interview_scheduled_at_idx').on(table.scheduledAt),
  })
)

export type Interview = typeof interviews.$inferSelect
export type NewInterview = typeof interviews.$inferInsert

// Junction table for interviewers (contacts) and interviews
export const interview_interviewers = pgTable(
  'interview_interviewers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    interviewId: uuid('interview_id')
      .notNull()
      .references(() => interviews.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }), // Link to contacts table
    role: text('role'), // e.g., Hiring Manager, Technical Interviewer, HR
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    interviewInterviewerIdx: uniqueIndex('interview_interviewer_unique_idx').on(
      table.interviewId,
      table.contactId
    ),
    interviewIdx: index('ii_interview_id_idx').on(table.interviewId),
    contactIdx: index('ii_contact_id_idx').on(table.contactId),
  })
)

export type InterviewInterviewer = typeof interview_interviewers.$inferSelect
export type NewInterviewInterviewer = typeof interview_interviewers.$inferInsert
