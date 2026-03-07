import { beforeEach, describe, expect, it } from 'vitest'

import { db, eq, sql } from '../index'
import { taggedItems } from '../schema/tags'
import { expectOwnershipDenied } from '../test/services/_shared/assertions'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '../test/services/_shared/harness'
import type { TagId, UserId } from './_shared/ids'
import { ConflictError, ForbiddenError, InternalError, NotFoundError, ValidationError } from './_shared/errors'
import { brandId } from './_shared/ids'
import type { Database } from './client'
import {
  createTag,
  listTagsForEntity,
  replaceEntityTags,
  updateTag,
} from './tags.service'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('db.tags.integration.user')
const nextEntityId = createDeterministicIdFactory('db.tags.integration.entity')

describe.skipIf(!dbAvailable)('tags.service integration', () => {
  let ownerId: UserId
  let otherUserId: UserId
  let entityId: string

  const cleanupUser = async (userId: UserId): Promise<void> => {
    await db.execute(
      sql`delete from tagged_items where tag_id in (select id from tags where owner_id = ${String(userId)})`,
    ).catch(() => {})
    await db.execute(sql`delete from tags where owner_id = ${String(userId)}`).catch(() => {})
    await db.execute(sql`delete from users where id = ${String(userId)}`).catch(() => {})
  }

  beforeEach(async () => {
    ownerId = brandId<UserId>(nextUserId())
    otherUserId = brandId<UserId>(nextUserId())
    entityId = nextEntityId()
    await cleanupUser(ownerId)
    await cleanupUser(otherUserId)
    await ensureIntegrationUsers([
      { id: String(ownerId), name: 'Tag Owner' },
      { id: String(otherUserId), name: 'Tag Other User' },
    ])
  })

  it('replaces entity tags with full-overwrite semantics for owner tags', async () => {
    const first = await createTag(ownerId, { name: `t-${entityId}-1` })
    const second = await createTag(ownerId, { name: `t-${entityId}-2` })
    const third = await createTag(ownerId, { name: `t-${entityId}-3` })

    await replaceEntityTags(
      ownerId,
      entityId,
      'finance_transaction',
      [brandId<TagId>(first.id), brandId<TagId>(second.id)],
    )

    await replaceEntityTags(
      ownerId,
      entityId,
      'finance_transaction',
      [brandId<TagId>(second.id), brandId<TagId>(third.id)],
    )

    const resolved = await listTagsForEntity(ownerId, entityId, 'finance_transaction')
    const resolvedIds = new Set(resolved.map((tag) => tag.id))

    expect(resolvedIds.has(second.id)).toBe(true)
    expect(resolvedIds.has(third.id)).toBe(true)
    expect(resolvedIds.has(first.id)).toBe(false)
    expect(resolved).toHaveLength(2)
  })

  it('is idempotent for duplicate ids and repeated replace calls', async () => {
    const alpha = await createTag(ownerId, { name: `dup-${entityId}-a` })
    const beta = await createTag(ownerId, { name: `dup-${entityId}-b` })
    const payload = [brandId<TagId>(alpha.id), brandId<TagId>(beta.id), brandId<TagId>(beta.id)]

    await replaceEntityTags(ownerId, entityId, 'note', payload)
    await replaceEntityTags(ownerId, entityId, 'note', payload)

    const rows = await db
      .select()
      .from(taggedItems)
      .where(eq(taggedItems.entityId, entityId))

    expect(rows).toHaveLength(2)
    const tagIdSet = new Set(rows.map((row) => row.tagId))
    expect(tagIdSet.has(alpha.id)).toBe(true)
    expect(tagIdSet.has(beta.id)).toBe(true)
  })

  it('rejects replace when any requested tag does not belong to owner', async () => {
    const ownerTag = await createTag(ownerId, { name: `own-${entityId}` })
    const foreignTag = await createTag(otherUserId, { name: `other-${entityId}` })

    await expectOwnershipDenied(async () => {
      await replaceEntityTags(ownerId, entityId, 'task', [
        brandId<TagId>(ownerTag.id),
        brandId<TagId>(foreignTag.id),
      ])
    })
  })

  it('keeps previous tags unchanged when replace fails ownership validation', async () => {
    const ownerTag = await createTag(ownerId, { name: `stable-owner-${entityId}` })
    const secondOwnerTag = await createTag(ownerId, { name: `stable-owner-2-${entityId}` })
    const foreignTag = await createTag(otherUserId, { name: `stable-other-${entityId}` })

    await replaceEntityTags(ownerId, entityId, 'task', [brandId<TagId>(ownerTag.id)])

    await expectOwnershipDenied(async () => {
      await replaceEntityTags(ownerId, entityId, 'task', [
        brandId<TagId>(secondOwnerTag.id),
        brandId<TagId>(foreignTag.id),
      ])
    })

    const resolved = await listTagsForEntity(ownerId, entityId, 'task')
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.id).toBe(ownerTag.id)
  })

  it('lists tags for entity scoped to owner only', async () => {
    const ownerTag = await createTag(ownerId, { name: `owner-${entityId}` })
    const otherTag = await createTag(otherUserId, { name: `other-${entityId}` })

    await replaceEntityTags(ownerId, entityId, 'task', [brandId<TagId>(ownerTag.id)])
    await replaceEntityTags(otherUserId, entityId, 'task', [brandId<TagId>(otherTag.id)])

    const ownerTags = await listTagsForEntity(ownerId, entityId, 'task')
    const otherTags = await listTagsForEntity(otherUserId, entityId, 'task')

    expect(ownerTags).toHaveLength(1)
    expect(otherTags).toHaveLength(1)
    expect(ownerTags[0]?.id).toBe(ownerTag.id)
    expect(otherTags[0]?.id).toBe(otherTag.id)
  })

  it('throws ValidationError for blank tag names', async () => {
    await expect(createTag(ownerId, { name: '   ' })).rejects.toBeInstanceOf(ValidationError)
  })

  it('throws ConflictError for duplicate owner tag names', async () => {
    await createTag(ownerId, { name: `dup-name-${entityId}` })
    await expect(createTag(ownerId, { name: `dup-name-${entityId}` })).rejects.toBeInstanceOf(ConflictError)
  })

  it('throws NotFoundError for updating missing tags', async () => {
    await expect(
      updateTag(brandId<TagId>(nextEntityId()), ownerId, { name: 'unused' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws ForbiddenError for updating another user tag', async () => {
    const created = await createTag(otherUserId, { name: `forbidden-${entityId}` })
    await expect(
      updateTag(brandId<TagId>(created.id), ownerId, { name: 'hijack' }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('throws InternalError for unexpected database failures', async () => {
    const failingDb = {
      insert: () => {
        throw new Error('synthetic db failure')
      },
    } as Database

    await expect(createTag(ownerId, { name: 'will-fail' }, failingDb)).rejects.toBeInstanceOf(InternalError)
  })
})
