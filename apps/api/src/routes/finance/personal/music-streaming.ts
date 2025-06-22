import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../../../middleware/auth.js'

const musicStreamingCalculationSchema = z.object({
  streams: z.number().int().positive(),
  rate: z.number().positive().optional(),
  platform: z.enum(['spotify', 'apple', 'youtube', 'other']).optional(),
})

export const financeMusicStreamingRoutes = new Hono()

// Calculate music streaming earnings
financeMusicStreamingRoutes.post(
  '/',
  requireAuth,
  zValidator('json', musicStreamingCalculationSchema),
  async (c) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'Not authorized' }, 401)
      }

      const validated = c.req.valid('json')

      // Platform-specific rates if not provided
      let rate = validated.rate
      if (!rate) {
        switch (validated.platform) {
          case 'spotify':
            rate = 0.0033
            break
          case 'apple':
            rate = 0.0056
            break
          case 'youtube':
            rate = 0.0018
            break
          default:
            rate = 0.004 // Average rate
        }
      }

      // Music streaming calculation logic
      const earnings = validated.streams * rate

      // Calculate different distribution scenarios
      const distributionScenarios = {
        individual: earnings,
        withLabel: earnings * 0.2, // Typical artist gets 20% with label
        independent: earnings * 0.8, // Independent artists keep ~80%
      }

      // Monthly projections
      const monthlyProjections = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        streams: validated.streams * (i + 1),
        earnings: earnings * (i + 1),
      }))

      return c.json({
        platform: validated.platform || 'average',
        streams: validated.streams,
        rate,
        earnings,
        distributionScenarios,
        monthlyProjections,
        calculatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Music streaming calculation error:', error)
      return c.json({ error: 'Failed to calculate music streaming earnings' }, 500)
    }
  }
)
