import { db } from '@hominem/db'
import { type JobApplication, type JobApplicationInsert, job_applications } from '@hominem/db/schema'
import { eq, type SQL } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const JobApplicationSchema = createSelectSchema(job_applications)
export const JobApplicationInsertSchema = createInsertSchema(job_applications)

export class ApplicationService {
  async create(data: JobApplicationInsert) {
    const [result] = await db.insert(job_applications).values(data).returning()
    return result
  }

  async update(id: string, data: Partial<JobApplicationInsert>) {
    const [result] = await db
      .update(job_applications)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(job_applications.id, id))
      .returning()
    return result
  }

  async findById(id: string) {
    return await db.select().from(job_applications).where(eq(job_applications.id, id))
  }

  async findMany(query?: SQL<JobApplication>) {
    return await db.select().from(job_applications).where(query)
  }

  async delete(id: string) {
    const [result] = await db
      .delete(job_applications)
      .where(eq(job_applications.id, id))
      .returning()
    return result
  }
}
