import { ApplicationService, JobApplicationInsertSchema } from '@hominem/utils/career'
import { db } from '@hominem/utils/db'
import { companies, job_applications, type JobApplicationInsert } from '@hominem/utils/schema'
import { desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ForbiddenError, NotFoundError, handleError } from '../lib/errors.js'
import { verifyAuth } from '../middleware/auth.js'

const updateSchema = z.object({
  data: JobApplicationInsertSchema.partial(),
})

export async function jobApplicationRoutes(fastify: FastifyInstance) {
  const applicationService = new ApplicationService()

  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    if (!request.userId) {
      throw ForbiddenError('Not authorized to create an application')
    }

    try {
      const validated = JobApplicationInsertSchema.omit({ userId: true }).parse(request.body)

      // Check if company exists
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, validated.companyId),
      })

      if (!company) {
        return reply.status(404).send({ error: 'Company not found' })
      }

      const result = await applicationService.create({
        ...validated,
        stages: validated.stages as JobApplicationInsert['stages'],
        userId: request.userId,
      })

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Update a job application
  fastify.put('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { data } = updateSchema.parse(request.body)

      const applications = await applicationService.findById(id)
      const application = applications[0]

      if (!application) {
        throw NotFoundError('Application not found')
      }

      if (application.userId !== request.userId) {
        throw ForbiddenError('Not authorized to update this application')
      }

      const result = await applicationService.update(id, {
        ...data,
        stages: data.stages as JobApplicationInsert['stages'],
      })

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get job application by ID
  fastify.get('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const applications = await applicationService.findById(id)
      const application = applications[0]

      if (!application) {
        throw NotFoundError('Application not found')
      }

      if (application.userId !== request.userId) {
        throw ForbiddenError('Not authorized to view this application')
      }

      return application
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get all job applications
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    if (!request.userId) {
      throw ForbiddenError('Not authorized to view applications')
    }

    try {
      const results = await db
        .select({
          company: companies,
          application: job_applications,
        })
        .from(job_applications)
        .where(eq(job_applications.userId, request.userId))
        .leftJoin(companies, eq(companies.id, job_applications.companyId))
        .orderBy(desc(job_applications.createdAt))

      return results.map(({ company, application }) => ({
        ...application,
        company: company?.name,
      }))
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Delete a job application
  fastify.delete('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const applications = await applicationService.findById(id)
      const application = applications[0]

      if (!application) {
        throw NotFoundError('Application not found')
      }

      if (application.userId !== request.userId) {
        throw ForbiddenError('Not authorized to delete this application')
      }

      await applicationService.delete(id)

      return { success: true }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Bulk create/update applications
  fastify.put('/bulk', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = request.userId
    if (!userId) {
      throw ForbiddenError('Not authorized to create applications')
    }

    try {
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
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
