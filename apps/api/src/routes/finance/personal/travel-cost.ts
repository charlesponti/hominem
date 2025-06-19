import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../../../middleware/auth.js'

// Mock destination costs for demo
// In production, this would use real travel cost APIs
const destinationCosts = {
  'New York': { flight: 350, hotel: 250, food: 80, activities: 50 },
  'San Francisco': { flight: 450, hotel: 280, food: 85, activities: 60 },
  Austin: { flight: 300, hotel: 180, food: 50, activities: 40 },
  London: { flight: 800, hotel: 220, food: 70, activities: 45 },
  Tokyo: { flight: 1200, hotel: 200, food: 60, activities: 55 },
  Paris: { flight: 850, hotel: 210, food: 75, activities: 65 },
  // Add more destinations as needed
}

const travelCostSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  departureDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'Invalid departure date format',
  }),
  returnDate: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Invalid return date format',
    })
    .optional(),
  travelers: z.number().int().positive().default(1),
  includeAccommodation: z.boolean().default(true),
  includeTransportation: z.boolean().default(true),
  includeFood: z.boolean().default(true),
  includeActivities: z.boolean().default(false),
})

export const financeTravelCostRoutes = new Hono()

// Calculate travel costs
// TODO: use real travel cost APIs
financeTravelCostRoutes.post('/', requireAuth, zValidator('json', travelCostSchema), async (c) => {
  try {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const validated = c.req.valid('json')
    const destination = validated.destination as keyof typeof destinationCosts

    // Parse dates for calculations
    const departureDate = new Date(validated.departureDate)
    const returnDate = validated.returnDate ? new Date(validated.returnDate) : null

    // Calculate trip duration
    const tripDuration = returnDate
      ? Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24))
      : 7 // Default to 7 days if no return date

    // Get costs or use average if destination not found
    const costs = destinationCosts[destination] || {
      flight: 500,
      hotel: 200,
      food: 65,
      activities: 50,
    }

    // Calculate costs based on options
    let totalCost = 0
    const costBreakdown = {
      transportation: 0,
      accommodation: 0,
      food: 0,
      activities: 0,
    }

    if (validated.includeTransportation) {
      costBreakdown.transportation = costs.flight * validated.travelers
      totalCost += costBreakdown.transportation
    }

    if (validated.includeAccommodation) {
      costBreakdown.accommodation = costs.hotel * tripDuration
      totalCost += costBreakdown.accommodation
    }

    if (validated.includeFood) {
      costBreakdown.food = costs.food * validated.travelers * tripDuration
      totalCost += costBreakdown.food
    }

    if (validated.includeActivities) {
      costBreakdown.activities = costs.activities * validated.travelers * tripDuration
      totalCost += costBreakdown.activities
    }

    // Calculate daily cost
    const dailyCost = totalCost / tripDuration

    return c.json({
      origin: validated.origin,
      destination: validated.destination,
      departureDate: departureDate.toISOString(),
      returnDate: returnDate ? returnDate.toISOString() : null,
      tripDuration,
      travelers: validated.travelers,
      totalCost,
      dailyCost,
      costBreakdown,
      options: {
        includeAccommodation: validated.includeAccommodation,
        includeTransportation: validated.includeTransportation,
        includeFood: validated.includeFood,
        includeActivities: validated.includeActivities,
      },
      calculatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Travel cost calculation error:', error)
    return c.json({ error: 'Failed to calculate travel cost' }, 500)
  }
})
