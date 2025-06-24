import { db } from '@hominem/utils/db'
import { health } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

const healthQuerySchema = z.object({
  userId: z.string().optional(),
  startDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  endDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  activityType: z.string().optional(),
  detailed: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
})

const healthDataSchema = z.object({
  userId: z.string(),
  date: z.string().transform((str) => new Date(str)),
  activityType: z.string(),
  duration: z.number(),
  caloriesBurned: z.number(),
  notes: z.string().optional(),
})

const updateHealthDataSchema = z.object({
  date: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  activityType: z.string().optional(),
  duration: z.number().optional(),
  caloriesBurned: z.number().optional(),
  notes: z.string().optional(),
})

export const healthRoutes = new Hono()

// Get health data with optional filters
healthRoutes.get('/', zValidator('query', healthQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query')
    const conditions = []

    if (query.userId) {
      conditions.push(eq(health.userId, query.userId))
    }

    if (query.startDate) {
      conditions.push(gte(health.date, query.startDate))
    }

    if (query.endDate) {
      conditions.push(lte(health.date, query.endDate))
    }

    if (query.activityType) {
      conditions.push(eq(health.activityType, query.activityType))
    }

    // If we have conditions, apply them with AND
    if (conditions.length > 0) {
      const results = await db
        .select()
        .from(health)
        .where(and(...conditions))
        .orderBy(desc(health.date))
      return c.json(results)
    }

    // Otherwise return all data
    const results = await db.select().from(health).orderBy(desc(health.date))
    return c.json(results)
  } catch (error) {
    console.error('Error fetching health data:', error)
    return c.json({ error: 'Failed to fetch health data' }, 500)
  }
})

// Get health data by ID
healthRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const numericId = Number.parseInt(id, 10)

    if (Number.isNaN(numericId)) {
      return c.json({ error: 'Invalid ID format' }, 400)
    }

    const result = await db.select().from(health).where(eq(health.id, numericId)).limit(1)

    if (result.length === 0) {
      return c.json({ error: 'Health record not found' }, 404)
    }

    return c.json(result[0])
  } catch (error) {
    console.error('Error fetching health record:', error)
    return c.json({ error: 'Failed to fetch health record' }, 500)
  }
})

// Add health data
healthRoutes.post('/', zValidator('json', healthDataSchema), async (c) => {
  try {
    const validated = c.req.valid('json')

    const result = await db.insert(health).values(validated).returning()
    return c.json(result[0])
  } catch (error) {
    console.error('Error creating health record:', error)
    return c.json({ error: 'Failed to create health record' }, 500)
  }
})

// Update health data
healthRoutes.put('/:id', zValidator('json', updateHealthDataSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const numericId = Number.parseInt(id, 10)

    if (Number.isNaN(numericId)) {
      return c.json({ error: 'Invalid ID format' }, 400)
    }

    const validated = c.req.valid('json')

    const result = await db
      .update(health)
      .set(validated)
      .where(eq(health.id, numericId))
      .returning()

    if (result.length === 0) {
      return c.json({ error: 'Health record not found' }, 404)
    }

    return c.json(result[0])
  } catch (error) {
    console.error('Error updating health record:', error)
    return c.json({ error: 'Failed to update health record' }, 500)
  }
})

// Delete health data
healthRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const numericId = Number.parseInt(id, 10)

    if (Number.isNaN(numericId)) {
      return c.json({ error: 'Invalid ID format' }, 400)
    }

    const result = await db.delete(health).where(eq(health.id, numericId))
    if (result.count === 0) {
      return c.json({ error: 'Health record not found' }, 404)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting health record:', error)
    return c.json({ error: 'Failed to delete health record' }, 500)
  }
})
