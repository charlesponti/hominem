import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HominemUser } from '@hominem/auth/server'
import { getTask } from '@hominem/db/services/tasks.service'
import type { AppContext } from '../src/middleware/auth'
import { errorMiddleware } from '../src/middleware/error'
import { tasksRoutes } from '../src/routes/tasks'

vi.mock('@hominem/db/services/tasks.service', () => {
  return {
    listTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  }
})

const userA: HominemUser = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  email: 'a@example.com',
  isAdmin: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function createAuthedApp() {
  return new Hono<AppContext>()
    .use('*', async (c, next) => {
      c.set('user', userA)
      c.set('userId', userA.id)
      await next()
    })
    .use('*', errorMiddleware)
    .route('/tasks', tasksRoutes)
}

function createUnauthedApp() {
  return new Hono<AppContext>()
    .use('*', errorMiddleware)
    .route('/tasks', tasksRoutes)
}

describe('authorization behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    const app = createUnauthedApp()

    const res = await app.request('/tasks')
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('does not expose another user task', async () => {
    const app = createAuthedApp()

    vi.mocked(getTask).mockResolvedValueOnce(null)
    const res = await app.request('/tasks/other-users-task-id')

    expect(res.status).toBe(404)
  })
})
