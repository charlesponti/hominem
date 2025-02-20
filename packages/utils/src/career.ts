import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";
import { job_applications, jobs } from "./db/schema/job.schema";
import { JobApplicationStage } from "./types";

export const JobInsertSchema = createInsertSchema(jobs);
export const JobSchema = createSelectSchema(jobs);

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
