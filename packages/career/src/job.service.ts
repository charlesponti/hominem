import type { JobOutput, JobInput } from '@hominem/db/types/career';

import { db } from '@hominem/db';
import { eq, type SQL } from '@hominem/db';
import { jobs } from '@hominem/db/schema/career';
import { companies } from '@hominem/db/schema/company';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const JobInsertSchema = createInsertSchema(jobs);
export const JobSchema = createSelectSchema(jobs);

export class JobService {
  async create(data: Omit<JobInput, 'id' | 'version' | 'createdAt' | 'updatedAt'>) {
    const [result] = await db.insert(jobs).values(data).returning();
    return result;
  }

  async update(id: string, data: Partial<JobInput>) {
    const [result] = await db
      .update(jobs)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
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
      .leftJoin(companies, eq(jobs.companyId, companies.id))
      .limit(1);

    return result[0];
  }

  async findMany(query: SQL<JobOutput>) {
    return await db.select().from(jobs).where(query);
  }

  async delete(id: string) {
    const [result] = await db.delete(jobs).where(eq(jobs.id, id)).returning();
    return result;
  }
}
