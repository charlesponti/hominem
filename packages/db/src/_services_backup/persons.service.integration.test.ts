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
  createPerson,
  deletePerson,
  getPerson,
  listPersons,
  updatePerson,
} from './persons.service'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('db.persons.integration.user')

describe.skipIf(!dbAvailable)('persons.service integration', () => {
  let ownerId: UserId
  let otherUserId: UserId

  const cleanupUser = async (userId: UserId): Promise<void> => {
    await db.execute(
      sql`delete from user_person_relations where person_id in (select id from persons where owner_user_id = ${String(userId)})`,
    ).catch(() => {})
    await db.execute(sql`delete from persons where owner_user_id = ${String(userId)}`).catch(() => {})
    await db.execute(sql`delete from users where id = ${String(userId)}`).catch(() => {})
  }

  beforeEach(async () => {
    ownerId = brandId<UserId>(nextUserId())
    otherUserId = brandId<UserId>(nextUserId())
    await cleanupUser(ownerId)
    await cleanupUser(otherUserId)
    await ensureIntegrationUsers([
      { id: String(ownerId), name: 'Person Owner' },
      { id: String(otherUserId), name: 'Person Other User' },
    ])
  })

  it('updates only provided optional fields and preserves omitted fields', async () => {
    const created = await createPerson(ownerId, {
      personType: 'friend',
      firstName: 'Alex',
      lastName: 'Owner',
      email: 'alex@example.com',
      notes: 'initial-note',
    })

    const patched = await updatePerson(created.id, ownerId, { firstName: 'Alicia' })
    expect(patched?.firstName).toBe('Alicia')
    expect(patched?.lastName).toBe('Owner')
    expect(patched?.notes).toBe('initial-note')

    const cleared = await updatePerson(created.id, ownerId, { notes: null })
    expect(cleared?.notes).toBeNull()
  })

  it('enforces tenant boundaries for read/update/delete', async () => {
    const created = await createPerson(ownerId, {
      personType: 'coworker',
      firstName: 'Sam',
    })

    const hidden = await getPerson(created.id, otherUserId)
    expect(hidden).toBeNull()

    await expectOwnershipDenied(async () => {
      await updatePerson(created.id, otherUserId, { firstName: 'Hijack' })
    })

    await expectOwnershipDenied(async () => {
      await deletePerson(created.id, otherUserId)
    })
  })

  it('lists only owner persons', async () => {
    await createPerson(ownerId, { personType: 'friend', firstName: 'One' })
    await createPerson(ownerId, { personType: 'friend', firstName: 'Two' })
    await createPerson(otherUserId, { personType: 'friend', firstName: 'Other' })

    const listed = await listPersons(ownerId)
    expect(listed).toHaveLength(2)
    expect(listed.every((person) => person.ownerUserId === String(ownerId))).toBe(true)
  })
})
