import { eq, type SQL } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { db } from "../db/index";
import { companies } from "../db/schema/company.schema";
import { jobs, type Job, type NewJob } from "../db/schema/job.schema";

export const JobInsertSchema = createInsertSchema(jobs);
export const JobSchema = createSelectSchema(jobs);

export class JobService {
	async create(
		data: Omit<NewJob, "id" | "version" | "createdAt" | "updatedAt">,
	) {
		const [result] = await db.insert(jobs).values(data).returning();
		return result;
	}

	async update(id: string, data: Partial<NewJob>) {
		const [result] = await db
			.update(jobs)
			.set({
				...data,
				updatedAt: new Date(),
				version: data.version ? data.version + 1 : 1,
			})
			.where(eq(jobs.id, id))
			.returning();
		return result;
	}

	async findById(id: string) {
		const result = await db
			.select()
			.from(jobs)
			.where(eq(jobs.id, id))
			.leftJoin(companies, eq(jobs.companyId, companies.id));

		return result;
	}

	async findMany(query: SQL<Job>) {
		return await db.select().from(jobs).where(query);
	}

	async delete(id: string) {
		const [result] = await db.delete(jobs).where(eq(jobs.id, id)).returning();
		return result;
	}
}
