import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import * as z from 'zod'

import { brandId, type TaskId, type UserId } from '@hominem/db'
import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
} from '../schemas/tasks.schema'
import { listTasks, getTask, createTask, updateTask, deleteTask } from '@hominem/db/services/tasks.service'
import { NotFoundError, ForbiddenError, ConflictError, InternalError } from '../errors'

const taskIdParamSchema = z.object({
  id: z.uuid(),
})

export const tasksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List tasks
  .get('/', async (c) => {
    try {
      const userId = c.get('userId')!
      const status = c.req.query('status')
      const priority = c.req.query('priority')
      const brandedUserId = brandId<UserId>(userId)
      const filters: { status?: string; priority?: string } = {}
      if (status !== undefined) filters.status = status
      if (priority !== undefined) filters.priority = priority

      const tasks = await listTasks(brandedUserId, filters)

      return c.json({ success: true, data: tasks })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  })
  // Get single task
  .get('/:id', zValidator('param', taskIdParamSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const { id } = c.req.valid('param')
      const brandedUserId = brandId<UserId>(userId)
      const taskId = brandId<TaskId>(id)

      const task = await getTask(taskId, brandedUserId)
      if (!task) {
        throw new NotFoundError('Task not found')
      }
      return c.json({ success: true, data: task })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  })
  // Create task
  .post('/', zValidator('json', CreateTaskInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const data = c.req.valid('json')
      const brandedUserId = brandId<UserId>(userId)
      const payload: {
        title: string
        description?: string
        status?: string
        priority?: string
        dueDate?: Date | null
      } = {
        title: data.title,
      }
      if (data.description !== undefined) payload.description = data.description
      if (data.status !== undefined) payload.status = data.status
      if (data.priority !== undefined) payload.priority = data.priority
      if (data.dueDate !== undefined) payload.dueDate = data.dueDate ? new Date(data.dueDate) : null

      const newTask = await createTask(payload, brandedUserId)

      return c.json({ success: true, data: newTask }, 201)
    } catch (error) {
      if (error instanceof ConflictError) {
        throw new ConflictError(error.message)
      }
      throw error
    }
  })
  // Update task
  .patch('/:id', zValidator('param', taskIdParamSchema), zValidator('json', UpdateTaskInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const { id } = c.req.valid('param')
      const data = c.req.valid('json')
      const brandedUserId = brandId<UserId>(userId)
      const taskId = brandId<TaskId>(id)

      const updateData = {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
      }

      const updatedTask = await updateTask(taskId, brandedUserId, updateData)
      if (!updatedTask) {
        throw new NotFoundError('Task not found or access denied')
      }
      return c.json({ success: true, data: updatedTask })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  })
  // Delete task
  .delete('/:id', zValidator('param', taskIdParamSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const { id } = c.req.valid('param')
      const brandedUserId = brandId<UserId>(userId)
      const taskId = brandId<TaskId>(id)

      const deleted = await deleteTask(taskId, brandedUserId)
      if (!deleted) {
        throw new NotFoundError('Task not found or access denied')
      }
      return c.json({ success: true, data: { id } })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  })
