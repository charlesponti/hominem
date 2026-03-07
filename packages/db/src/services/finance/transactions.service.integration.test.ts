import { beforeEach, describe, expect, it } from 'vitest'

import { db, sql } from '../../index'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '../../test/services/_shared/harness'
import type { FinanceAccountId, FinanceTransactionId, UserId } from '../_shared/ids'
import { brandId } from '../_shared/ids'
import { createFinanceAccount } from './accounts.service'
import {
  createFinanceTransaction,
  deleteFinanceTransactionByDateId,
  getFinanceTransactionByDateId,
  listTransactionsByAccount,
  listTransactionsByDateRange,
  updateFinanceTransactionByDateId,
} from './transactions.service'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('db.finance.transactions.integration.user')

describe.skipIf(!dbAvailable)('finance.transactions.service integration', () => {
  let ownerId: UserId
  let otherUserId: UserId
  let ownerAccountId: FinanceAccountId

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
      { id: String(ownerId), name: 'Finance Tx Owner' },
      { id: String(otherUserId), name: 'Finance Tx Other User' },
    ])

    const account = await createFinanceAccount({
      userId: ownerId,
      name: 'Primary Account',
      accountType: 'checking',
    })
    ownerAccountId = brandId<FinanceAccountId>(account.id)
  })

  it('supports (date,id) point get/update/delete behavior', async () => {
    const created = await createFinanceTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: '42.50',
      transactionType: 'expense',
      description: 'Lunch',
      date: '2026-03-01',
    })
    const txId = brandId<FinanceTransactionId>(created.id)

    const missingDate = await getFinanceTransactionByDateId(ownerId, txId, '2026-03-02')
    expect(missingDate).toBeNull()

    const loaded = await getFinanceTransactionByDateId(ownerId, txId, '2026-03-01')
    expect(loaded?.id).toBe(created.id)

    const noUpdate = await updateFinanceTransactionByDateId(ownerId, txId, '2026-03-02', { description: 'Nope' })
    expect(noUpdate).toBeNull()

    const updated = await updateFinanceTransactionByDateId(ownerId, txId, '2026-03-01', { description: 'Brunch' })
    expect(updated?.description).toBe('Brunch')

    const deniedDelete = await deleteFinanceTransactionByDateId(otherUserId, txId, '2026-03-01')
    expect(deniedDelete).toBe(false)

    const deleted = await deleteFinanceTransactionByDateId(ownerId, txId, '2026-03-01')
    expect(deleted).toBe(true)
  })

  it('lists by date range and account with deterministic ordering', async () => {
    await createFinanceTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: '10.00',
      transactionType: 'expense',
      description: 'Old',
      date: '2026-02-20',
    })
    await createFinanceTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: '20.00',
      transactionType: 'expense',
      description: 'Middle',
      date: '2026-02-21',
    })
    await createFinanceTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: '30.00',
      transactionType: 'expense',
      description: 'New',
      date: '2026-02-22',
    })

    const range = await listTransactionsByDateRange(ownerId, '2026-02-20', '2026-02-22')
    expect(range.map((row) => row.description)).toEqual(['New', 'Middle', 'Old'])

    const byAccount = await listTransactionsByAccount(ownerId, ownerAccountId, '2026-02-20', '2026-02-22')
    expect(byAccount).toHaveLength(3)
    expect(byAccount.map((row) => row.description)).toEqual(['New', 'Middle', 'Old'])
  })
})
