import { db, sql } from '@hominem/db'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  createAccount,
  createTransaction,
  getTransactionTagIds,
  queryTransactionsByContract,
  replaceTransactionTags,
} from './modern-finance'

async function hasTaggingTables(): Promise<boolean> {
  const result = await db.execute(sql`
    select
      to_regclass('public.tags') as tags_table,
      to_regclass('public.tagged_items') as tagged_items_table
  `)
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === 'object' && 'rows' in result
      ? (result as { rows?: Array<{ tags_table: string | null; tagged_items_table: string | null }> }).rows ?? []
      : []
  return Boolean(rows[0]?.tags_table && rows[0]?.tagged_items_table)
}

const dbAvailable = await isIntegrationDatabaseAvailable()
const taggingTablesAvailable = dbAvailable ? await hasTaggingTables() : false
const nextUserId = createDeterministicIdFactory('finance.tags.integration')
const nextTagId = createDeterministicIdFactory('finance.tags.integration.tag')

describe.skipIf(!dbAvailable || !taggingTablesAvailable)('modern-finance tags integration', () => {
  let ownerId: string
  let otherUserId: string
  let ownerAccountId: string
  let txOneId: string
  let txTwoId: string
  let ownerFoodTagId: string
  let ownerTravelTagId: string
  let otherTagId: string

  const cleanupUser = async (userId: string): Promise<void> => {
    await db.execute(sql`
      delete from tagged_items
      where entity_type = ${'finance_transaction'}
        and entity_id in (select id from finance_transactions where user_id = ${userId})
    `).catch(() => {})
    await db.execute(sql`delete from finance_transactions where user_id = ${userId}`).catch(() => {})
    await db.execute(sql`delete from finance_accounts where user_id = ${userId}`).catch(() => {})
    await db.execute(sql`delete from tags where owner_id = ${userId}`).catch(() => {})
    await db.execute(sql`delete from users where id = ${userId}`).catch(() => {})
  }

  beforeEach(async () => {
    ownerId = nextUserId()
    otherUserId = nextUserId()
    ownerFoodTagId = nextTagId()
    ownerTravelTagId = nextTagId()
    otherTagId = nextTagId()

    await cleanupUser(ownerId)
    await cleanupUser(otherUserId)
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Tags User' },
      { id: otherUserId, name: 'Finance Tags User' },
    ])

    await db.execute(sql`
      insert into tags (id, owner_id, name)
      values
        (${ownerFoodTagId}, ${ownerId}, ${'food'}),
        (${ownerTravelTagId}, ${ownerId}, ${'travel'}),
        (${otherTagId}, ${otherUserId}, ${'foreign-tag'})
    `)

    const account = await createAccount({
      userId: ownerId,
      name: 'Tag Checking',
      type: 'depository',
      balance: 1000,
    })
    ownerAccountId = account.id

    const txOne = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -25,
      description: 'Lunch',
      date: '2026-03-01',
    })
    const txTwo = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -60,
      description: 'Flight',
      date: '2026-03-02',
    })
    txOneId = txOne.id
    txTwoId = txTwo.id
  })

  it('replaces transaction tags idempotently and filters transactions by tag', async () => {
    await replaceTransactionTags(txOneId, ownerId, [ownerFoodTagId])
    await replaceTransactionTags(txTwoId, ownerId, [ownerTravelTagId])

    const foodFiltered = await queryTransactionsByContract({
      userId: ownerId,
      tagIds: [ownerFoodTagId],
      limit: 10,
      offset: 0,
    })
    expect(foodFiltered).toHaveLength(1)
    expect(foodFiltered[0]?.id).toBe(txOneId)

    const travelFiltered = await queryTransactionsByContract({
      userId: ownerId,
      tagNames: ['travel'],
      limit: 10,
      offset: 0,
    })
    expect(travelFiltered).toHaveLength(1)
    expect(travelFiltered[0]?.id).toBe(txTwoId)

    await replaceTransactionTags(txOneId, ownerId, [ownerFoodTagId, ownerFoodTagId])
    const txOneTags = await getTransactionTagIds(txOneId, ownerId)
    expect(txOneTags).toEqual([ownerFoodTagId])
  })

  it('rejects cross-tenant tags on transaction tagging', async () => {
    await expect(replaceTransactionTags(txOneId, ownerId, [otherTagId])).rejects.toThrow(
      'One or more tags are invalid for this user',
    )
  })
})
