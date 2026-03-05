import { beforeEach, describe, expect, it } from 'vitest'

import { db, eq, sql } from '../index'
import { tasks } from '../schema/tasks'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '../test/services/_shared/harness'
import type { TaskId, UserId } from './_shared/ids'
import { brandId } from './_shared/ids'
import { createTask, deleteTask, getTask, listTasks, updateTask } from './tasks.service'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('db.tasks.integration.user')

describe.skipIf(!dbAvailable)('tasks.service integration', () => {
  let ownerId: UserId
  let otherUserId: UserId

  const cleanupUser = async (userId: UserId): Promise<void> => {
    await db.execute(sql`delete from tasks where user_id = ${String(userId)}`).catch(() => {})
    await db.execute(sql`delete from users where id = ${String(userId)}`).catch(() => {})
  }

  beforeEach(async () => {
    ownerId = brandId<UserId>(nextUserId())
    otherUserId = brandId<UserId>(nextUserId())
    await cleanupUser(ownerId)
    await cleanupUser(otherUserId)
    await ensureIntegrationUsers([
      { id: String(ownerId), name: 'Task Owner' },
      { id: String(otherUserId), name: 'Task Other User' },
    ])
  })

  it('creates task with defaults and gets by owner', async () => {
    const created = await createTask(
      {
        title: 'Integration Task',
      },
      ownerId,
    )

    expect(created.id).toBeDefined()
    expect(created.title).toBe('Integration Task')
    expect(created.userId).toBe(String(ownerId))
    expect(created.status).toBe('pending')
    expect(created.priority).toBe('medium')

    const loaded = await getTask(brandId<TaskId>(created.id), ownerId)
    expect(loaded?.id).toBe(created.id)
  })

  it('lists only owner tasks ordered by createdAt then id', async () => {
    await createTask({ title: 'Owner A' }, ownerId)
    await createTask({ title: 'Owner B' }, ownerId)
    await createTask({ title: 'Other C' }, otherUserId)

    const listed = await listTasks(ownerId)
    expect(listed).toHaveLength(2)
    expect(listed.every((task) => task.userId === String(ownerId))).toBe(true)
  })

  it('updates only owner tasks and returns null for non-owner', async () => {
    const created = await createTask({ title: 'To Update' }, ownerId)
    const taskId = brandId<TaskId>(created.id)

    const denied = await updateTask(taskId, otherUserId, { title: 'Hijacked' })
    expect(denied).toBeNull()

    const updated = await updateTask(taskId, ownerId, { title: 'Updated' })
    expect(updated?.title).toBe('Updated')
  })

  it('deletes only owner task and keeps row when unauthorized', async () => {
    const created = await createTask({ title: 'Delete me' }, ownerId)
    const taskId = brandId<TaskId>(created.id)

    const denied = await deleteTask(taskId, otherUserId)
    expect(denied).toBe(false)

    const stillThere = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, created.id))
    expect(stillThere).toHaveLength(1)

    const deleted = await deleteTask(taskId, ownerId)
    expect(deleted).toBe(true)
  })

  it('filters by status and respects list limit', async () => {
    await createTask({ title: 'Pending One', status: 'pending' }, ownerId)
    await createTask({ title: 'Done One', status: 'completed' }, ownerId)
    await createTask({ title: 'Pending Two', status: 'pending' }, ownerId)

    const pending = await listTasks(ownerId, {
      status: 'pending',
      pagination: { limit: 1 },
    })

    expect(pending).toHaveLength(1)
    expect(pending[0]?.status).toBe('pending')
  })

  it('clamps pagination limits to the allowed range', async () => {
    for (let index = 0; index < 105; index += 1) {
      await createTask({ title: `Clamp ${index}` }, ownerId)
    }

    const minimumClamped = await listTasks(ownerId, {
      pagination: { limit: 0 },
    })
    expect(minimumClamped).toHaveLength(1)

    const maximumClamped = await listTasks(ownerId, {
      pagination: { limit: 999 },
    })
    expect(maximumClamped).toHaveLength(100)
  })

  it('applies deterministic cursor pagination on (createdAt,id) ordering', async () => {
    await createTask({ title: 'Cursor A' }, ownerId)
    await createTask({ title: 'Cursor B' }, ownerId)
    await createTask({ title: 'Cursor C' }, ownerId)

    const ordered = await listTasks(ownerId, {
      pagination: { limit: 10 },
    })
    expect(ordered).toHaveLength(3)

    const pivot = ordered[1]
    expect(pivot).toBeDefined()
    const cursor = Buffer.from(`${pivot?.createdAt}|${pivot?.id}`).toString('base64')

    const afterPivot = await listTasks(ownerId, {
      pagination: { limit: 10, cursor },
    })

    expect(afterPivot).toHaveLength(1)
    expect(afterPivot[0]?.id).toBe(ordered[2]?.id)
  })
})
