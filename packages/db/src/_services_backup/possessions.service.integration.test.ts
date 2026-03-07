import { beforeEach, describe, expect, it } from 'vitest'

import { db, eq, sql } from '../index'
import { possessions } from '../schema/possessions'
import { expectOwnershipDenied } from '../test/services/_shared/assertions'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '../test/services/_shared/harness'
import type { UserId } from './_shared/ids'
import { brandId } from './_shared/ids'
import {
  createContainer,
  createPossession,
  deleteContainer,
  listContainers,
} from './possessions.service'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('db.possessions.integration.user')

describe.skipIf(!dbAvailable)('possessions.service integration', () => {
  let ownerId: UserId
  let otherUserId: UserId

  const cleanupUser = async (userId: UserId): Promise<void> => {
    await db.execute(sql`delete from possessions where user_id = ${String(userId)}`).catch(() => {})
    await db.execute(sql`delete from possession_containers where user_id = ${String(userId)}`).catch(() => {})
    await db.execute(sql`delete from users where id = ${String(userId)}`).catch(() => {})
  }

  beforeEach(async () => {
    ownerId = brandId<UserId>(nextUserId())
    otherUserId = brandId<UserId>(nextUserId())
    await cleanupUser(ownerId)
    await cleanupUser(otherUserId)
    await ensureIntegrationUsers([
      { id: String(ownerId), name: 'Possession Owner' },
      { id: String(otherUserId), name: 'Possession Other User' },
    ])
  })

  it('nullifies possession container ids when container is deleted', async () => {
    const container = await createContainer(ownerId, { name: 'Closet' })
    const item = await createPossession(ownerId, {
      name: 'Jacket',
      containerId: container.id,
    })

    const deleted = await deleteContainer(container.id, ownerId)
    expect(deleted).toBe(true)

    const rows = await db.select().from(possessions).where(eq(possessions.id, item.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.containerId).toBeNull()
  })

  it('enforces ownership for container deletion', async () => {
    const container = await createContainer(ownerId, { name: 'Desk Drawer' })

    await expectOwnershipDenied(async () => {
      await deleteContainer(container.id, otherUserId)
    })
  })

  it('lists containers only for owner', async () => {
    await createContainer(ownerId, { name: 'Owner Box' })
    await createContainer(otherUserId, { name: 'Other Box' })

    const listed = await listContainers(ownerId)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.userId).toBe(String(ownerId))
  })
})
