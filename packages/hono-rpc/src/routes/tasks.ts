import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  UpdateTaskStatusSchema,
} from '../schemas/tasks.schema'
import { listTasks, getTask, createTask, updateTask, deleteTask } from '@hominem/db/services/tasks.service'
import { NotFoundError, ForbiddenError, ConflictError, InternalError } from '../errors'
import { brandId } from '@hominem/db'

export const tasksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List tasks
  .get('/', async (c) => {
    try {
      const userId = c.get('userId')!
      const status = c.req.query('status')
      const priority = c.req.query('priority')
      const filters: { status?: string; priority?: string } = {}
      if (status !== undefined) filters.status = status
      if (priority !== undefined) filters.priority = priority

      const tasks = await listTasks(userId as any, filters)

      return c.json({ success: true, data: tasks })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  })
  // Get single task
  .get('/:id', async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')

      const task = await getTask(id as any, userId as any)
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

      const newTask = await createTask(payload, userId as any)

      return c.json({ success: true, data: newTask }, 201)
    } catch (error) {
      if (error instanceof ConflictError) {
        throw new ConflictError(error.message)
      }
      throw error
    }
  })
  // Update task
  .patch('/:id', zValidator('json', UpdateTaskInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')
      const data = c.req.valid('json')

      const updateData = {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
      }

      const updatedTask = await updateTask(id as any, userId as any, updateData)
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
  .delete('/:id', async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')

      const deleted = await deleteTask(id as any, userId as any)
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
