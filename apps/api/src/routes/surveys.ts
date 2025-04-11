import { db } from '@ponti/utils/db'
import { surveyOptions, surveyVotes, surveys } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ForbiddenError, handleError } from '../lib/errors'
import { verifyAuth } from '../middleware/auth'

const createSurveySchema = z.object({
  name: z.string(),
  description: z.string(),
  options: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
})

const voteSchema = z.object({
  surveyId: z.string(),
  optionId: z.string(),
})

export async function surveyRoutes(fastify: FastifyInstance) {
  // Create a new survey
  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      throw ForbiddenError('Not authorized to create a survey')
    }

    try {
      const validated = createSurveySchema.parse(request.body)

      const [survey] = await db
        .insert(surveys)
        .values({
          name: validated.name,
          description: validated.description,
          userId,
        })
        .returning()

      await db.insert(surveyOptions).values(
        validated.options.map((option) => ({
          ...option,
          surveyId: survey.id,
        }))
      )

      return survey
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // List all surveys for authenticated user
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      throw ForbiddenError('Not authorized to create a survey')
    }

    try {
      const results = await db.query.surveys.findMany({
        where: eq(surveys.userId, userId),
        with: {
          options: true,
          votes: true,
        },
      })

      return results
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Vote on a survey
  fastify.post('/vote', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      throw ForbiddenError('Not authorized to create a survey')
    }

    try {
      const validated = voteSchema.parse(request.body)

      await db.insert(surveyVotes).values({
        surveyId: validated.surveyId,
        optionId: validated.optionId,
        userId,
      })

      return { success: true }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
