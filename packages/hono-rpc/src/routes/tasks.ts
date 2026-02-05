import { TasksService } from '@hominem/services'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import type { TaskPriority, TaskStatus } from '../schemas/tasks.schema'
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  UpdateTaskStatusSchema,
} from '../schemas/tasks.schema'
import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'

const tasksService = new TasksService()

export const tasksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List tasks
  .get('/', async (c) => {
    const userId = c.get('userId')!

    const tasks = await tasksService.list(userId)
    return c.json({ tasks })
  })
  // Get single task
  .get('/:id', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const task = await tasksService.getById(id, userId)
    return c.json(task)
  })
  // Create task
  .post('/', zValidator('json', CreateTaskInputSchema), async (c) => {
    const userId = c.get('userId')!
    const data = c.req.valid('json')

    const taskData = {
      ...data,
      userId,
      dueDate: data.dueDate || null,
    }
    const newTask = await tasksService.create(taskData)
    return c.json(newTask, 201)
  })
  // Update task
  .patch('/:id', zValidator('json', UpdateTaskInputSchema), async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')
    const data = c.req.valid('json')

    const updateData: Partial<{
      title: string
      description: string | null
      status: TaskStatus
      priority: TaskPriority
      dueDate: string | null
    }> = {}

    if (data.title !== undefined) {
      updateData.title = data.title
    }
    if (data.description !== undefined) {
      updateData.description = data.description
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate
    }

    const updatedTask = await tasksService.update(id, userId, updateData)
    return c.json(updatedTask)
  })
  // Delete task
  .delete('/:id', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const deletedTask = await tasksService.delete(id, userId)
    return c.json(deletedTask)
  })
  // Update task status
  .post('/:id/status', zValidator('json', UpdateTaskStatusSchema), async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')
    const { status } = c.req.valid('json')

    const updatedTask = await tasksService.updateStatus(id, userId, status)
    return c.json(updatedTask)
  })
