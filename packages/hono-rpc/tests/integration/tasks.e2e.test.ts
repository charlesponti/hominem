import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HominemUser } from '@hominem/auth/server'
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from '@hominem/db/services/tasks.service'
import type { AppContext } from '../../src/middleware/auth'
import { errorMiddleware } from '../../src/middleware/error'
import { tasksRoutes } from '../../src/routes/tasks'

vi.mock('@hominem/db/services/tasks.service', () => {
  return {
    listTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  }
})

const mockUser: HominemUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'test@example.com',
  isAdmin: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockTask: NonNullable<Awaited<ReturnType<typeof getTask>>> = {
  id: '22222222-2222-2222-2222-222222222222',
  userId: mockUser.id,
  title: 'Test task',
  description: null,
  status: 'todo',
  priority: 'medium',
  dueDate: null,
  completedAt: null,
  parentId: null,
  listId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function createApp() {
  return new Hono<AppContext>()
    .use('*', async (c, next) => {
      c.set('user', mockUser)
      c.set('userId', mockUser.id)
      await next()
    })
    .use('*', errorMiddleware)
    .route('/tasks', tasksRoutes)
}

describe('tasks route integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supports create -> get -> update -> delete flow', async () => {
    const app = createApp()

    vi.mocked(createTask).mockResolvedValueOnce(mockTask)
    const createRes = await app.request('/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: mockTask.title }),
    })
    expect(createRes.status).toBe(201)

    vi.mocked(getTask).mockResolvedValueOnce(mockTask)
    const getRes = await app.request(`/tasks/${mockTask.id}`)
    expect(getRes.status).toBe(200)

    const updatedTask: NonNullable<Awaited<ReturnType<typeof updateTask>>> = {
      ...mockTask,
      title: 'Updated title',
    }
    vi.mocked(updateTask).mockResolvedValueOnce(updatedTask)
    const updateRes = await app.request(`/tasks/${mockTask.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated title' }),
    })
    expect(updateRes.status).toBe(200)

    vi.mocked(deleteTask).mockResolvedValueOnce(true)
    const deleteRes = await app.request(`/tasks/${mockTask.id}`, {
      method: 'DELETE',
    })
    expect(deleteRes.status).toBe(200)
  })

  it('lists tasks for authenticated user', async () => {
    const app = createApp()
    vi.mocked(listTasks).mockResolvedValueOnce([mockTask])

    const res = await app.request('/tasks')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})
