import { TaskPrioritySchema, TaskStatusSchema } from '@hominem/db/schema/tasks'
import type { TaskInsert } from '@hominem/db/types/tasks'
import { TasksService, NotFoundError, ValidationError, ForbiddenError } from '@hominem/services'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'

const tasksService = new TasksService()

/**
 * Serialization helper to ensure consistent date formatting
 */
function serializeTask(t: any) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    userId: t.userId,
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : t.createdAt?.toISOString(),
    updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : t.updatedAt?.toISOString(),
  }
}

const CreateTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema.default('todo'),
  priority: TaskPrioritySchema.default('medium'),
  dueDate: z.string().optional(),
})

const UpdateTaskInputSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullish(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.string().optional().nullish(),
})

const UpdateTaskStatusSchema = z.object({
  status: TaskStatusSchema,
})

export const tasksRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List tasks
  .get('/', async (c) => {
    const userId = c.get('userId')!

    const tasks = await tasksService.list(userId)
    return c.json({ tasks: tasks.map(serializeTask) })
  })
  // Get single task
  .get('/:id', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const task = await tasksService.getById(id, userId)
    return c.json(serializeTask(task))
  })
  // Create task
  .post('/', zValidator('json', CreateTaskInputSchema), async (c) => {
    const userId = c.get('userId')!
    const data = c.req.valid('json')

    const taskData: TaskInsert = {
      ...data,
      userId,
      dueDate: data.dueDate || null,
    }
    const newTask = await tasksService.create(taskData)
    return c.json(serializeTask(newTask), 201)
  })
  // Update task
  .patch('/:id', zValidator('json', UpdateTaskInputSchema), async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')
    const data = c.req.valid('json')

    const updateData: Partial<{
      title: string
      description: string | null
      status: 'todo' | 'in-progress' | 'done' | 'archived'
      priority: 'low' | 'medium' | 'high' | 'urgent'
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
    return c.json(serializeTask(updatedTask))
  })
  // Delete task
  .delete('/:id', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const deletedTask = await tasksService.delete(id, userId)
    return c.json(serializeTask(deletedTask))
  })
  // Update task status
  .post('/:id/status', zValidator('json', UpdateTaskStatusSchema), async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')
    const { status } = c.req.valid('json')

    const updatedTask = await tasksService.updateStatus(id, userId, status)
    return c.json(serializeTask(updatedTask))
  })
