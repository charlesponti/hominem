import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyAuth } from '../middleware/auth'
import { handleError } from '../lib/errors'

// Email mask schemas
const generateEmailSchema = z.object({
  userId: z.string(),
})

const emailIdSchema = z.object({
  id: z.string(),
})

const userIdSchema = z.object({
  userId: z.string(),
})

export async function emailMaskRoutes(fastify: FastifyInstance) {
  const emailAddresses: {
    id: string
    uuidEmail: string
    userId: string
    isActive: boolean
  }[] = []

  const emailDomain = process.env.emailDomain || 'example.com'

  // Generate a new masked email
  fastify.post('/generate', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = generateEmailSchema.parse(request.body)
      const uuid = randomUUID()
      const newEmail = {
        id: randomUUID(),
        uuidEmail: `${uuid}@${emailDomain}`,
        userId: validated.userId,
        isActive: true,
      }
      emailAddresses.push(newEmail)
      return newEmail
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Deactivate an email mask
  fastify.put('/:id/deactivate', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const { id } = request.params as { id: string }
      const index = emailAddresses.findIndex((email) => email.id === id)
      
      if (index === -1) {
        reply.code(404)
        return { success: false, error: 'Email mask not found' }
      }
      
      emailAddresses[index].isActive = false
      return { success: true }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get email mask by ID
  fastify.get('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const { id } = request.params as { id: string }
      const email = emailAddresses.find((email) => email.id === id)
      
      if (!email) {
        reply.code(404)
        return { error: 'Email mask not found' }
      }
      
      return email
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get all email masks for a user
  fastify.get('/user/:userId', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const params = request.params as { userId: string }
      const validatedParams = userIdSchema.parse(params)
      
      const emails = emailAddresses.filter(
        (email) => email.userId === validatedParams.userId && email.isActive
      )
      
      return emails
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
