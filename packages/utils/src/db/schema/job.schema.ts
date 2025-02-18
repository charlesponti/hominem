import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
	JobApplicationStage,
	JobApplicationStatus,
} from "../../types/career.types";
import { users } from "../../types/users";
import { companies } from "./company.schema";
import { notes } from "./notes.schema";

export const jobs = pgTable("jobs", {
	id: uuid("id").primaryKey().defaultRandom(),
	companyId: uuid("company_id").references(() => companies.id),
	title: text("title").notNull(),
	description: text("description").notNull(),
	requirements: jsonb("requirements").notNull().default([]),
	salary: jsonb("salary").notNull(),
	location: jsonb("location").notNull(),
	status: text("status").notNull().default("draft"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	version: integer("version").notNull().default(1),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export const JobInsert = createInsertSchema(jobs);
export const Job = createSelectSchema(jobs);

export type JosApplicationStages = { stage: JobApplicationStage; date: Date }[];
export const job_applications = pgTable("job_applications", {
	id: uuid("id").primaryKey().defaultRandom(),
	position: text("position").notNull(),
	resume: text("resume"),
	coverLetter: text("cover_letter"),
	startDate: timestamp("start_date").notNull().defaultNow(),
	endDate: timestamp("end_date"),
	link: text("link"),
	location: text("location").notNull().default("Remote"),
	reference: boolean("reference").notNull().default(false),
	stages: jsonb("stages").notNull().$type<JosApplicationStages>(),
	status: text("status").notNull().default(JobApplicationStatus.APPLIED),
	salaryQuoted: text("salary_quoted"),
	salaryAccepted: text("salary_accepted"),
	jobPosting: text("job_posting"),
	phoneScreen: text("phone_screen"),

	// Relationships
	companyId: uuid("company_id")
		.notNull()
		.references(() => companies.id),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	jobId: uuid("job_id").references(() => jobs.id),

	// Metadata
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type JobApplicationInsert = typeof job_applications.$inferInsert;
export type JobApplication = typeof job_applications.$inferSelect;
export const JobApplicationSchema = createSelectSchema(job_applications);
export const JobApplicationInsertSchema = createInsertSchema(job_applications, {
	stages: z.array(
		z.object({
			stage: z.enum([
				JobApplicationStage.APPLICATION,
				JobApplicationStage.PHONE_SCREEN,
				JobApplicationStage.TECHNICAL_SCREEN_CALL,
				JobApplicationStage.TECHNICAL_SCREEN_EXERCISE,
				JobApplicationStage.INTERVIEW,
				JobApplicationStage.IN_PERSON,
				JobApplicationStage.OFFER,
			]),
			date: z.date(),
		}),
	),
});

export const application_notes = pgTable("application_notes", {
	applicationId: uuid("application_id")
		.notNull()
		.references(() => job_applications.id),
	noteId: uuid("note_id")
		.notNull()
		.references(() => notes.id),
});
