import { openai } from '@ai-sdk/openai'
import { zValidator } from '@hono/zod-validator'
import { generateObject } from 'ai'
import { Hono } from 'hono'
import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'

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

export const aiTourRoutes = new Hono()

// Generate tour cost breakdown
aiTourRoutes.post('/', requireAuth, zValidator('json', inputSchema), async (c) => {
  try {
    const validatedInput = c.req.valid('json')

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

    return c.json(tourBreakdown)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid input', details: error.issues }, 400)
    }
    console.error('Error generating tour breakdown:', error)
    return c.json({ error: 'Failed to generate tour breakdown' }, 500)
  }
})
