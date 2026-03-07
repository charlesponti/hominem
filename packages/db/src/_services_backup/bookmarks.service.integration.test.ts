import { beforeEach, describe, expect, it } from 'vitest'

import { db, sql } from '../index'
import { expectOwnershipDenied } from '../test/services/_shared/assertions'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '../test/services/_shared/harness'
import type { UserId } from './_shared/ids'
import { brandId } from './_shared/ids'
import {
  createBookmark,
  deleteBookmark,
  getBookmark,
  listBookmarks,
  updateBookmark,
} from './bookmarks.service'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('db.bookmarks.integration.user')

describe.skipIf(!dbAvailable)('bookmarks.service integration', () => {
  let ownerId: UserId
  let otherUserId: UserId

  const cleanupUser = async (userId: UserId): Promise<void> => {
    await db.execute(sql`delete from bookmarks where user_id = ${String(userId)}`).catch(() => {})
    await db.execute(sql`delete from users where id = ${String(userId)}`).catch(() => {})
  }

  beforeEach(async () => {
    ownerId = brandId<UserId>(nextUserId())
    otherUserId = brandId<UserId>(nextUserId())
    await cleanupUser(ownerId)
    await cleanupUser(otherUserId)
    await ensureIntegrationUsers([
      { id: String(ownerId), name: 'Bookmark Owner' },
      { id: String(otherUserId), name: 'Bookmark Other User' },
    ])
  })

  it('filters by folder for owner only', async () => {
    await createBookmark(ownerId, { url: 'https://a.example', folder: 'work' })
    await createBookmark(ownerId, { url: 'https://b.example', folder: 'personal' })
    await createBookmark(otherUserId, { url: 'https://c.example', folder: 'work' })

    const work = await listBookmarks(ownerId, 'work')
    expect(work).toHaveLength(1)
    expect(work[0]?.userId).toBe(String(ownerId))
    expect(work[0]?.folder).toBe('work')
  })

  it('enforces ownership for get/update/delete', async () => {
    const created = await createBookmark(ownerId, { url: 'https://private.example' })

    const hidden = await getBookmark(created.id, otherUserId)
    expect(hidden).toBeNull()

    await expectOwnershipDenied(async () => {
      await updateBookmark(created.id, otherUserId, { title: 'Hijack' })
    })

    await expectOwnershipDenied(async () => {
      await deleteBookmark(created.id, otherUserId)
    })

    const updated = await updateBookmark(created.id, ownerId, { title: 'Updated' })
    expect(updated?.title).toBe('Updated')
  })
})
