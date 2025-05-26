import {
  ApplicationService,
  CompanyService,
  JobApplicationInsertSchema,
  JobInsertSchema,
  JobService,
} from '@hominem/utils/career'
import { db } from '@hominem/utils/db'
import { companies, job_applications, jobs, type JobApplicationInsert } from '@hominem/utils/schema'
import { desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ForbiddenError, NotFoundError } from '../lib/errors.js'
import { verifyAuth } from '../middleware/auth.js'

const updateJobSchema = z.object({
  data: JobInsertSchema.partial(),
})
const updateApplicationSchema = z.object({
  data: JobApplicationInsertSchema.partial(),
})

export async function careerRoutes(fastify: FastifyInstance) {
  const companyService = new CompanyService()
  const jobService = new JobService()
  const applicationService = new ApplicationService()

  // --- Companies ---
  fastify.get('/companies', { preHandler: verifyAuth }, async (request) => {
    return await db.select().from(companies)
  })

  fastify.get('/companies/:id', { preHandler: verifyAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const company = await companyService.findById(id)
    if (!company) throw NotFoundError('Company not found')
    return company
  })

  fastify.post('/companies', { preHandler: verifyAuth }, async (request) => {
    // Accepts only name, fills the rest with empty/defaults
    const validated = z.object({ name: z.string() }).parse(request.body)
    return await companyService.create({
      name: validated.name,
      description: '',
      website: '',
      industry: '',
      size: '',
      location: {},
    })
  })

  fastify.put('/companies/:id', { preHandler: verifyAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const { data } = z
      .object({ data: z.object({ name: z.string().optional() }) })
      .parse(request.body)
    return await companyService.update(id, data)
  })

  fastify.delete('/companies/:id', { preHandler: verifyAuth }, async (request) => {
    const { id } = request.params as { id: string }
    return await companyService.delete(id)
  })

  // --- Jobs ---
  fastify.get('/jobs', { preHandler: verifyAuth }, async (request) => {
    return await db.select().from(jobs)
  })

  fastify.get('/jobs/:id', { preHandler: verifyAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const job = await jobService.findById(id)
    if (!job) throw NotFoundError('Job not found')
    return job
  })

  fastify.post('/jobs', { preHandler: verifyAuth }, async (request) => {
    const validated = JobInsertSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      version: true,
    }).parse(request.body)
    return await jobService.create(validated)
  })

  fastify.put('/jobs/:id', { preHandler: verifyAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const { data } = updateJobSchema.parse(request.body)
    return await jobService.update(id, data)
  })

  fastify.delete('/jobs/:id', { preHandler: verifyAuth }, async (request) => {
    const { id } = request.params as { id: string }
    return await jobService.delete(id)
  })

  // --- Job Applications ---
  fastify.get('/applications', { preHandler: verifyAuth }, async (request) => {
    if (!request.userId) throw ForbiddenError('Not authorized to view applications')
    const results = await db
      .select({ company: companies, application: job_applications })
      .from(job_applications)
      .where(eq(job_applications.userId, request.userId))
      .leftJoin(companies, eq(companies.id, job_applications.companyId))
      .orderBy(desc(job_applications.createdAt))
    return results.map(({ company, application }) => ({ ...application, company: company?.name }))
  })

  fastify.get('/applications/:id', { preHandler: verifyAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const applications = await applicationService.findById(id)
    const application = applications[0]
    if (!application) throw NotFoundError('Application not found')
    if (application.userId !== request.userId)
      throw ForbiddenError('Not authorized to view this application')
    return application
  })

  fastify.post('/applications', { preHandler: verifyAuth }, async (request) => {
    if (!request.userId) throw ForbiddenError('Not authorized to create an application')
    const validated = JobApplicationInsertSchema.omit({ userId: true }).parse(request.body)
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, validated.companyId),
    })
    if (!company) throw NotFoundError('Company not found')
    return await applicationService.create({
      ...validated,
      stages: validated.stages as JobApplicationInsert['stages'],
      userId: request.userId,
    })
  })

  fastify.put('/applications/:id', { preHandler: verifyAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const { data } = updateApplicationSchema.parse(request.body)
    const applications = await applicationService.findById(id)
    const application = applications[0]
    if (!application) throw NotFoundError('Application not found')
    if (application.userId !== request.userId)
      throw ForbiddenError('Not authorized to update this application')
    return await applicationService.update(id, {
      ...data,
      stages: data.stages as JobApplicationInsert['stages'],
    })
  })

  fastify.delete('/applications/:id', { preHandler: verifyAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const applications = await applicationService.findById(id)
    const application = applications[0]
    if (!application) throw NotFoundError('Application not found')
    if (application.userId !== request.userId)
      throw ForbiddenError('Not authorized to delete this application')
    await applicationService.delete(id)
    return { success: true }
  })

  // Bulk create/update applications
  fastify.put('/applications/bulk', { preHandler: verifyAuth }, async (request) => {
    const userId = request.userId
    if (!userId) throw ForbiddenError('Not authorized to create applications')

    const validated = z.array(JobApplicationInsertSchema).parse(request.body)

    const results = await db.transaction(async (tx) => {
      return Promise.all(
        validated.map((application) =>
          tx
            .insert(job_applications)
            .values({
              ...application,
              stages: application.stages as JobApplicationInsert['stages'],
              userId,
            })
            .onConflictDoUpdate({
              target: [job_applications.position, job_applications.companyId],
              set: {
                ...application,
                stages: application.stages as JobApplicationInsert['stages'],
              },
            })
        )
      )
    })

    return results
  })

  // --- Application Notes (now part of job_applications) ---
  // To update notes, use the application update endpoint with the `notes` field.
}
