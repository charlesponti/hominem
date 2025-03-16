import { JobApplicationInsertSchema } from '@ponti/utils/career'
import { db } from '@ponti/utils/db'
import { companies, job_applications } from '@ponti/utils/schema'
import { desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyAuth } from '../middleware/auth'
import { ForbiddenError, NotFoundError, handleError } from '../utils/errors'

export async function applicationRoutes(fastify: FastifyInstance) {
  // Get all applications for authenticated user
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

  // Get application by ID
  fastify.get('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const application = await db.query.job_applications.findFirst({
        where: eq(job_applications.id, id),
      })

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

  // Create a new application
  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    if (!request.userId) {
      throw ForbiddenError('Not authorized to create an application')
    }

    try {
      const validated = JobApplicationInsertSchema.omit({ userId: true }).parse(request.body)

      const result = await db.insert(job_applications).values({
        ...validated,
        userId: request.userId,
      })

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Update an application
  fastify.put('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const validated = JobApplicationInsertSchema.partial().parse(request.body)

      const [application] = await db
        .select()
        .from(job_applications)
        .where(eq(job_applications.id, id))

      if (!application) {
        throw NotFoundError('Application not found')
      }

      if (application.userId !== request.userId) {
        throw ForbiddenError('Not authorized to update this application')
      }

      const result = await db
        .update(job_applications)
        .set(validated)
        .where(eq(job_applications.id, id))
        .returning()

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Delete an application
  fastify.delete('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const application = await db.query.job_applications.findFirst({
        where: eq(job_applications.id, id),
      })

      if (!application) {
        throw NotFoundError('Application not found')
      }

      if (application.userId !== request.userId) {
        throw ForbiddenError('Not authorized to delete this application')
      }

      await db.delete(job_applications).where(eq(job_applications.id, id))

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
                userId,
              })
              .onConflictDoUpdate({
                target: [job_applications.position, job_applications.companyId],
                set: application,
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
