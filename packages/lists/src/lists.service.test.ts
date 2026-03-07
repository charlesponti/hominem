import crypto from 'node:crypto'

import { db, sql } from '@hominem/db'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  getAllUserListsWithPlaces,
  getListById,
  getOwnedLists,
  getOwnedListsWithItemCount,
  getPlaceLists,
} from './list-queries.service'

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

async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`)
    return true
  } catch {
    return false
  }
}

const dbAvailable = await isDatabaseAvailable()

describe.skipIf(!dbAvailable)('list-queries integration', () => {
  let ownerId: string
  let otherUserId: string
  let ownerListA: string
  let ownerListB: string

  const createUser = async (id: string): Promise<void> => {
    await db.execute(sql`
      insert into users (id, email, name)
      values (${id}, ${`${id}@example.com`}, ${'List Query User'})
      on conflict (id) do nothing
    `)
  }

  const cleanupForUsers = async (userIds: string[]): Promise<void> => {
    for (const userId of userIds) {
      await db.execute(sql`delete from tasks where user_id = ${userId}`).catch(() => {})
      await db.execute(sql`delete from task_lists where user_id = ${userId}`).catch(() => {})
      await db.execute(sql`delete from users where id = ${userId}`).catch(() => {})
    }
  }

  const insertTask = async (params: { id: string; userId: string; title: string; listId: string | null }) => {
    await db.execute(sql`
      insert into tasks (id, user_id, title, status, priority, list_id)
      values (
        ${params.id},
        ${params.userId},
        ${params.title},
        'pending',
        'medium',
        ${params.listId}
      )
    `)
  }

  beforeEach(async () => {
    ownerId = crypto.randomUUID()
    otherUserId = crypto.randomUUID()
    ownerListA = crypto.randomUUID()
    ownerListB = crypto.randomUUID()

    await cleanupForUsers([ownerId, otherUserId])
    await createUser(ownerId)
    await createUser(otherUserId)

    await db.execute(sql`
      insert into task_lists (id, user_id, name)
      values
        (${ownerListA}, ${ownerId}, 'Alpha'),
        (${ownerListB}, ${ownerId}, 'Bravo')
    `)

    await db.execute(sql`
      insert into task_lists (id, user_id, name)
      values (${crypto.randomUUID()}, ${otherUserId}, 'Other User List')
    `)

    await insertTask({
      id: crypto.randomUUID(),
      userId: ownerId,
      title: 'Golden Gate Park',
      listId: ownerListA,
    })
    await insertTask({
      id: crypto.randomUUID(),
      userId: ownerId,
      title: 'Ferry Building',
      listId: ownerListA,
    })
    await insertTask({
      id: crypto.randomUUID(),
      userId: ownerId,
      title: 'Yosemite',
      listId: ownerListB,
    })
    await insertTask({
      id: crypto.randomUUID(),
      userId: ownerId,
      title: 'Backlog without list',
      listId: null,
    })
  })

  it('returns only owned lists and includes owner metadata', async () => {
    const owned = await getOwnedLists(ownerId)

    expect(owned.length).toBe(2)
    const ids = new Set(owned.map((list) => list.id))
    expect(ids.has(ownerListA)).toBe(true)
    expect(ids.has(ownerListB)).toBe(true)

    for (const list of owned) {
      expect(list.ownerId).toBe(ownerId)
      expect(list.owner?.email).toBe(`${ownerId}@example.com`)
    }
  })

  it('projects deterministic item counts for owned lists', async () => {
    const owned = await getOwnedListsWithItemCount(ownerId)

    const byId = new Map(owned.map((list) => [list.id, list]))
    expect(byId.get(ownerListA)?.itemCount).toBe(2)
    expect(byId.get(ownerListB)?.itemCount).toBe(1)

    const dbCounts = await db.execute(sql`
      select list_id, count(*)::int as count
      from tasks
      where user_id = ${ownerId}
        and list_id is not null
      group by list_id
    `)

    const countRows = resultRows<{ list_id: string; count: number }>(dbCounts)
    expect(countRows.length).toBe(2)
  })

  it('enforces strict visibility in getListById', async () => {
    const asOwner = await getListById(ownerListA, ownerId)
    expect(asOwner).not.toBeNull()
    expect(asOwner?.id).toBe(ownerListA)

    const asOther = await getListById(ownerListA, otherUserId)
    expect(asOther).toBeNull()

    const asAnonymous = await getListById(ownerListA, null)
    expect(asAnonymous).toBeNull()
  })

  it('returns owned projections and no shared projections', async () => {
    const response = await getAllUserListsWithPlaces(ownerId)

    expect(response.ownedListsWithPlaces.length).toBe(2)
    expect(response.sharedListsWithPlaces).toEqual([])

    for (const list of response.ownedListsWithPlaces) {
      expect(list.isOwnList).toBe(true)
      expect(list.hasAccess).toBe(true)
      expect(Array.isArray(list.places)).toBe(true)
    }
  })

  it('searches owned lists by place key against task titles', async () => {
    const byName = await getPlaceLists({ userId: ownerId, placeId: 'golden' })
    expect(byName.length).toBe(1)
    expect(byName[0]?.id).toBe(ownerListA)
    expect(byName[0]?.itemCount).toBe(1)

    const empty = await getPlaceLists({ userId: ownerId })
    expect(empty).toEqual([])
  })
})
