import { db, sql } from '@hominem/db'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils'
import { beforeEach, describe, expect, it } from 'vitest'

import { createList, deleteList, updateList } from './list-crud.service'

function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[]
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows
    if (Array.isArray(rows)) {
      return rows as T[]
    }
  }
  return []
}

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('lists.crud.integration')

describe.skipIf(!dbAvailable)('list-crud integration', () => {
  let ownerId: string
  let otherUserId: string

  const cleanupForUsers = async (userIds: string[]): Promise<void> => {
    if (userIds.length === 0) {
      return
    }

    for (const userId of userIds) {
      await db.execute(sql`delete from task_lists where user_id = ${userId}`).catch(() => {})
      await db.execute(sql`delete from users where id = ${userId}`).catch(() => {})
    }
  }

  beforeEach(async () => {
    ownerId = nextUserId()
    otherUserId = nextUserId()

    await cleanupForUsers([ownerId, otherUserId])
    await ensureIntegrationUsers([
      { id: ownerId, name: 'List User' },
      { id: otherUserId, name: 'List User' },
    ])
  })

  it('creates a list for owner', async () => {
    const created = await createList('Inbox', ownerId)

    expect(created).not.toBeNull()
    expect(created?.name).toBe('Inbox')
    expect(created?.ownerId).toBe(ownerId)

    const stored = await db.execute(sql`
      select user_id
      from task_lists
      where id = ${created!.id}
      limit 1
    `)
    const row = resultRows<{ user_id: string }>(stored)[0]
    expect(row?.user_id).toBe(ownerId)
  })

  it('prevents duplicate list names per owner deterministically', async () => {
    const first = await createList('Errands', ownerId)
    const second = await createList('Errands', ownerId)

    expect(first).not.toBeNull()
    expect(second).toBeNull()
  })

  it('allows same list name for different owners', async () => {
    const ownerList = await createList('Shared Name', ownerId)
    const otherList = await createList('Shared Name', otherUserId)

    expect(ownerList).not.toBeNull()
    expect(otherList).not.toBeNull()
    expect(ownerList?.id).not.toBe(otherList?.id)
  })

  it('denies non-owner update and delete', async () => {
    const created = await createList('Protected', ownerId)
    expect(created).not.toBeNull()

    const updatedByOther = await updateList(created!.id, 'Hijacked', otherUserId)
    expect(updatedByOther).toBeNull()

    const deletedByOther = await deleteList(created!.id, otherUserId)
    expect(deletedByOther).toBe(false)

    const stillExists = await db.execute(sql`
      select name
      from task_lists
      where id = ${created!.id}
      limit 1
    `)
    const stillExistsRow = resultRows<{ name: string }>(stillExists)[0]
    expect(stillExistsRow).toBeDefined()
    expect(stillExistsRow?.name).toBe('Protected')
  })

  it('updates and deletes when owner matches', async () => {
    const created = await createList('Initial', ownerId)
    expect(created).not.toBeNull()

    const updated = await updateList(created!.id, 'Updated', ownerId)
    expect(updated).not.toBeNull()
    expect(updated?.name).toBe('Updated')

    const deleted = await deleteList(created!.id, ownerId)
    expect(deleted).toBe(true)

    const afterDelete = await db.execute(sql`
      select id
      from task_lists
      where id = ${created!.id}
      limit 1
    `)
    const afterDeleteRow = resultRows<{ id: string }>(afterDelete)[0]
    expect(afterDeleteRow).toBeUndefined()
  })
})
