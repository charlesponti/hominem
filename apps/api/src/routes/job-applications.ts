import { FastifyInstance } from 'fastify'
import { ApplicationService, CompanyService, JobApplicationInsertSchema } from '@ponti/utils/career'
import { z } from 'zod'
import { handleError } from '../utils/errors'

const updateSchema = z.object({
  data: z.object({}).passthrough(),
})

export async function jobApplicationRoutes(fastify: FastifyInstance) {
  // Create a new job application
  fastify.post('/', async (request, reply) => {
    try {
      const validated = JobApplicationInsertSchema.parse(request.body)
      
      const companyService = new CompanyService()
      const company = await companyService.findById(validated.companyId)
      
      if (!company) {
        return reply.status(404).send({ error: 'Company not found' })
      }

      const applicationService = new ApplicationService()
      const applicationId = await applicationService.create(validated)

      const application = await applicationService.findById(applicationId.toString())
      return application
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Update a job application
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { data } = updateSchema.parse(request.body)
      
      const applicationService = new ApplicationService()
      const success = await applicationService.update(id, data)
      
      if (!success) {
        return reply.status(404).send({ error: 'Application not found' })
      }
      
      const application = await applicationService.findById(id)
      return application
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get job application by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      
      const applicationService = new ApplicationService()
      const application = await applicationService.findById(id)
      
      if (!application) {
        return reply.status(404).send({ error: 'Application not found' })
      }
      
      return application
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get all job applications
  fastify.get('/', async (request, reply) => {
    try {
      const applicationService = new ApplicationService()
      const applications = await applicationService.findMany()
      
      return applications
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Delete a job application
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      
      const applicationService = new ApplicationService()
      const success = await applicationService.delete(id)
      
      if (!success) {
        return reply.status(404).send({ error: 'Application not found' })
      }
      
      return { success: true }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}