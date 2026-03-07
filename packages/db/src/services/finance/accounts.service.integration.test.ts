import { beforeEach, describe, expect, it } from 'vitest'

import { db, sql } from '../../index'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '../../test/services/_shared/harness'
import type { FinanceAccountId, UserId } from '../_shared/ids'
import { brandId } from '../_shared/ids'
import {
  createFinanceAccount,
  deleteFinanceAccount,
  listFinanceAccounts,
  updateFinanceAccount,
} from './accounts.service'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('db.finance.accounts.integration.user')

describe.skipIf(!dbAvailable)('finance.accounts.service integration', () => {
  let ownerId: UserId
  let otherUserId: UserId

  const cleanupUser = async (userId: UserId): Promise<void> => {
    await db.execute(sql`delete from finance_transactions where user_id = ${String(userId)}`).catch(() => {})
    await db.execute(sql`delete from finance_accounts where user_id = ${String(userId)}`).catch(() => {})
    await db.execute(sql`delete from users where id = ${String(userId)}`).catch(() => {})
  }

  beforeEach(async () => {
    ownerId = brandId<UserId>(nextUserId())
    otherUserId = brandId<UserId>(nextUserId())
    await cleanupUser(ownerId)
    await cleanupUser(otherUserId)
    await ensureIntegrationUsers([
      { id: String(ownerId), name: 'Finance Owner' },
      { id: String(otherUserId), name: 'Finance Other User' },
    ])
  })

  it('creates and lists only owner accounts', async () => {
    await createFinanceAccount({
      userId: ownerId,
      name: 'Owner Checking',
      accountType: 'checking',
    })
    await createFinanceAccount({
      userId: otherUserId,
      name: 'Other Savings',
      accountType: 'savings',
    })

    const listed = await listFinanceAccounts(ownerId)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.userId).toBe(String(ownerId))
    expect(listed[0]?.name).toBe('Owner Checking')
  })

  it('updates and deletes only for owner', async () => {
    const created = await createFinanceAccount({
      userId: ownerId,
      name: 'Updatable',
      accountType: 'checking',
    })
    const accountId = brandId<FinanceAccountId>(created.id)

    const deniedUpdate = await updateFinanceAccount(accountId, otherUserId, { name: 'Nope' })
    expect(deniedUpdate).toBeNull()

    const updated = await updateFinanceAccount(accountId, ownerId, { name: 'Updated Name' })
    expect(updated?.name).toBe('Updated Name')

    const deniedDelete = await deleteFinanceAccount(accountId, otherUserId)
    expect(deniedDelete).toBe(false)

    const deleted = await deleteFinanceAccount(accountId, ownerId)
    expect(deleted).toBe(true)
  })
})
