import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import * as z from 'zod'

import { db, ForbiddenError, NotFoundError } from '@hominem/db'
import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
} from '@hominem/rpc/schemas/tasks.schema'

const taskIdParamSchema = z.object({
  id: z.uuid(),
})

// Helper: Verify task ownership
async function getTaskWithOwnershipCheck(taskId: string, userId: string) {
  const task = await db
    .selectFrom('tasks')
    .selectAll()
    .where('id', '=', taskId)
    .where('user_id', '=', userId)
    .executeTakeFirst()

  if (!task) {
    throw new ForbiddenError('Task not found or access denied', 'ownership')
  }

  return task
}

export const tasksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List tasks
  .get('/', async (c) => {
    const userId = c.get('userId')!
    const status = c.req.query('status')
    const priority = c.req.query('priority')
    const limit = c.req.query('limit') ? Math.min(Number.parseInt(c.req.query('limit')!), 100) : 50

    let query = db
      .selectFrom('tasks')
      .selectAll()
      .where('user_id', '=', userId)

    if (status) {
      query = query.where('status', '=', status)
    }
    if (priority) {
      query = query.where('priority', '=', priority)
    }

    const tasks = await query
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .limit(limit)
      .execute()

    return c.json({ success: true, data: tasks })
  })
  // Get single task
  .get('/:id', zValidator('param', taskIdParamSchema), async (c) => {
    const userId = c.get('userId')!
    const { id } = c.req.valid('param')

    const task = await db
      .selectFrom('tasks')
      .selectAll()
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirst()

    if (!task) {
      throw new NotFoundError('Task not found')
    }
    return c.json({ success: true, data: task })
  })
  // Create task
  .post('/', zValidator('json', CreateTaskInputSchema), async (c) => {
    const userId = c.get('userId')!
    const data = c.req.valid('json')

    const newTask = await db
      .insertInto('tasks')
      .values({
        user_id: userId,
        title: data.title,
        description: data.description || null,
        status: data.status || 'pending',
        priority: data.priority || 'medium',
        due_date: data.dueDate || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return c.json({ success: true, data: newTask }, 201)
  })
  // Update task
  .patch('/:id', zValidator('param', taskIdParamSchema), zValidator('json', UpdateTaskInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const { id } = c.req.valid('param')
      const data = c.req.valid('json')

      // Verify ownership first
      await getTaskWithOwnershipCheck(id, userId)

      const updateData: {
        title?: string
        description?: string | null
        status?: string
        priority?: string
        due_date?: string | null
        updated_at: string
      } = { updated_at: new Date().toISOString() }
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.status !== undefined) updateData.status = data.status
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate

      const updatedTask = await db
        .updateTable('tasks')
        .set(updateData)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()

      if (!updatedTask) {
        throw new NotFoundError('Task not found or access denied')
      }
      return c.json({ success: true, data: updatedTask })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new NotFoundError('Task not found or access denied')
      }
      throw error
    }
  })
  // Delete task
  .delete('/:id', zValidator('param', taskIdParamSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const { id } = c.req.valid('param')

      // Verify ownership first
      await getTaskWithOwnershipCheck(id, userId)

      const result = await db
        .deleteFrom('tasks')
        .where('id', '=', id)
        .executeTakeFirst()

      if (!result.numDeletedRows) {
        throw new NotFoundError('Task not found or access denied')
      }
      return c.json({ success: true, data: { id } })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new NotFoundError('Task not found or access denied')
      }
      throw error
    }
  })
