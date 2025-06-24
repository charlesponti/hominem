import { db } from '@hominem/utils/db'
import { goals, GoalSchema } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { ForbiddenError } from '../lib/errors.js'
export const goalsRoutes = new Hono()

// List all goals for the authenticated user
goalsRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) throw ForbiddenError('Unauthorized')
  const userGoals = await db.select().from(goals).where(eq(goals.userId, userId))
  return c.json({ goals: userGoals })
})

// Create a new goal
goalsRoutes.post(
  '/',
  zValidator('json', GoalSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true })),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) throw ForbiddenError('Unauthorized')
    const goalData = c.req.valid('json')
    const [newGoal] = await db
      .insert(goals)
      .values({ ...goalData, userId })
      .returning()
    return c.json({ goal: newGoal }, 201)
  }
)

// Update a goal
goalsRoutes.put(
  '/:id',
  zValidator(
    'json',
    GoalSchema.partial().omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  ),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) throw ForbiddenError('Unauthorized')
    const { id } = c.req.param()
    const updateData = c.req.valid('json')
    const [updatedGoal] = await db
      .update(goals)
      .set({ ...updateData, updatedAt: new Date().toISOString() })
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning()
    if (!updatedGoal) return c.json({ error: 'Goal not found' }, 404)
    return c.json({ goal: updatedGoal })
  }
)

// Delete a goal
goalsRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) throw ForbiddenError('Unauthorized')
  const { id } = c.req.param()
  const [deletedGoal] = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning()
  if (!deletedGoal) return c.json({ error: 'Goal not found' }, 404)
  return c.json({ success: true })
})
