import { eq, type SQL } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import z from 'zod'
import { db } from '../db'
import {
  job_applications,
  type JobApplication,
  type JobApplicationInsert,
} from '../db/schema/job.schema'
import { JobApplicationStage } from '../types/career.types'

export const JobApplicationSchema = createSelectSchema(job_applications)
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
      date: z.string(),
    })
  ),
})

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
