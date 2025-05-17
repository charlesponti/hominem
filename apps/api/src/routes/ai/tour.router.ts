import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import type { FastifyInstance } from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { handleError } from '../../lib/errors'
import { verifyAuth } from '../../middleware/auth'

const TourCostBreakdown = z.object({
  transportation: z.object({
    vehicleRental: z.number(),
    fuel: z.number(),
    flights: z.number().optional(),
    equipmentTransport: z.number(),
  }),
  accommodation: z.object({
    hotelCosts: z.number(),
    numberOfNights: z.number(),
    crewAccommodation: z.number(),
  }),
  venues: z.object({
    averageVenueCost: z.number(),
    equipmentRental: z.number(),
    staffing: z.number(),
    insurance: z.number(),
  }),
  routing: z.array(
    z.object({
      city: z.string(),
      dateRange: z.string(),
      distanceFromPrevious: z.number().optional(),
    })
  ),
  totalCost: z.number(),
})

const inputSchema = z.object({
  startingDate: z.string().optional(),
  startCity: z.string().min(1),
  endCity: z.string().min(1),
  genres: z.array(z.string()).optional(),
  numberOfBandMembers: z.number().min(1).default(4),
  numberOfCrewMembers: z.number().min(0).default(2),
  durationInDays: z.number().min(1).max(90).default(14),
})

export async function tourRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/tour',
    // Assuming auth might be required, similar to other API routes.
    // If this route is public, { preHandler: verifyAuth } can be removed.
    { preHandler: verifyAuth },
    async (request, reply) => {
      // const { userId } = request // verifyAuth adds userId to request
      // if (!userId) return reply.code(401).send({ error: 'Not authorized' })

      try {
        const validatedInput = inputSchema.parse(request.body)

        // Read the prompt template from the markdown file
        const promptTemplatePath = path.join(
          process.cwd(), // Use current working directory
          'src', // Relative path from CWD to src
          'prompts',
          'tour-cost-breakdown.md'
        )
        const promptTemplate = await fs.readFile(promptTemplatePath, 'utf-8')

        // Inject variables into the prompt template
        let prompt = promptTemplate
          .replace('{{durationInDays}}', validatedInput.durationInDays.toString())
          .replace('{{startCity}}', validatedInput.startCity)
          .replace('{{endCity}}', validatedInput.endCity)
          .replace('{{numberOfBandMembers}}', validatedInput.numberOfBandMembers.toString())
          .replace('{{numberOfCrewMembers}}', validatedInput.numberOfCrewMembers.toString())
          .replace('{{startingDate}}', validatedInput.startingDate || new Date().toISOString())

        const genresListBlock =
          validatedInput.genres && validatedInput.genres.length > 0
            ? `- Music genre: ${validatedInput.genres.join(', ')}`
            : ''
        prompt = prompt.replace('{{genresListBlock}}', genresListBlock)

        const genresForOptimization =
          validatedInput.genres && validatedInput.genres.length > 0
            ? validatedInput.genres.join('/')
            : 'generic'
        prompt = prompt.replace('{{genresForOptimization}}', genresForOptimization)

        const { object: tourBreakdown } = await generateObject({
          model: openai('gpt-4o-mini'),
          prompt,
          schema: TourCostBreakdown,
          temperature: 0.7,
        })

        return reply.send(tourBreakdown)
      } catch (error) {
        if (error instanceof z.ZodError) {
          // For Zod errors, send a 400 Bad Request
          return reply.code(400).send({ error: 'Invalid input', details: error.issues })
        }
        // For other errors, use the centralized handleError
        return handleError(error as Error, reply)
      }
    }
  )
}
