import crypto from 'node:crypto'

import { db, sql } from '@hominem/db'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  createAccount,
  createBudgetCategory,
  createTransaction,
  deleteAllFinanceDataWithSummary,
  exportFinanceData,
  replaceTransactionTags,
  upsertPlaidItem,
} from './modern-finance'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('finance.data-ops.integration')

describe.skipIf(!dbAvailable)('modern-finance data ops integration', () => {
  let ownerId: string
  let otherUserId: string
  let ownerAccountId: string
  let otherAccountId: string

  const cleanupUser = async (userId: string): Promise<void> => {
    await db.execute(sql`delete from tagged_items where entity_type = ${'finance_transaction'} and entity_id in (select id from finance_transactions where user_id = ${userId})`).catch(() => {})
    await db.execute(sql`delete from plaid_items where user_id = ${userId}`).catch(() => {})
    await db.execute(sql`delete from budget_goals where user_id = ${userId}`).catch(() => {})
    await db.execute(sql`delete from finance_transactions where user_id = ${userId}`).catch(() => {})
    await db.execute(sql`delete from tags where owner_id = ${userId}`).catch(() => {})
    await db.execute(sql`delete from finance_accounts where user_id = ${userId}`).catch(() => {})
    await db.execute(sql`delete from users where id = ${userId}`).catch(() => {})
  }

  beforeEach(async () => {
    ownerId = nextUserId()
    otherUserId = nextUserId()

    await cleanupUser(ownerId)
    await cleanupUser(otherUserId)
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance DataOps User' },
      { id: otherUserId, name: 'Finance DataOps User' },
    ])

    const ownerAccount = await createAccount({
      userId: ownerId,
      name: 'Owner Checking',
      type: 'depository',
      balance: 1500,
    })
    ownerAccountId = ownerAccount.id

    const otherAccount = await createAccount({
      userId: otherUserId,
      name: 'Other Checking',
      type: 'depository',
      balance: 2000,
    })
    otherAccountId = otherAccount.id
  })

  it('exports only caller-scoped finance data', async () => {
    const ownerTag = await createBudgetCategory({
      userId: ownerId,
      name: `Food-${crypto.randomUUID().slice(0, 8)}`,
    })
    const ownerTx = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -42,
      description: 'Dinner',
      date: '2026-03-03',
      category: 'Food',
      merchantName: 'Cafe',
    })
    await replaceTransactionTags(ownerTx.id, ownerId, [ownerTag.id])

    await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      itemId: `item-${crypto.randomUUID()}`,
      institutionId: null,
      transactionsCursor: 'cursor-1',
      accessToken: 'token-1',
    })

    await createTransaction({
      userId: otherUserId,
      accountId: otherAccountId,
      amount: -99,
      description: 'Other User Spend',
      date: '2026-03-04',
      category: 'Other',
      merchantName: 'Other',
    })

    const exported = await exportFinanceData(ownerId)

    expect(exported.accounts.length).toBe(1)
    expect(exported.accounts[0]?.userId).toBe(ownerId)
    expect(exported.transactions.length).toBe(1)
    expect(exported.transactions[0]?.userId).toBe(ownerId)
    expect(exported.tags.length).toBe(1)
    expect(exported.tags[0]?.userId).toBe(ownerId)
    expect(exported.plaidItems.length).toBe(1)
    expect(exported.plaidItems[0]?.userId).toBe(ownerId)
  })

  it('delete-all summary removes only caller-scoped data', async () => {
    const ownerTag = await createBudgetCategory({
      userId: ownerId,
      name: `Transit-${crypto.randomUUID().slice(0, 8)}`,
    })
    const ownerTx = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -30,
      description: 'Metro',
      date: '2026-03-05',
      category: 'Transit',
      merchantName: 'Transit',
    })
    await replaceTransactionTags(ownerTx.id, ownerId, [ownerTag.id])

    await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      itemId: `item-${crypto.randomUUID()}`,
      institutionId: null,
      transactionsCursor: null,
      accessToken: null,
    })

    await createTransaction({
      userId: otherUserId,
      accountId: otherAccountId,
      amount: -45,
      description: 'Other User Keep',
      date: '2026-03-05',
      category: 'Keep',
      merchantName: 'Keep',
    })

    const summary = await deleteAllFinanceDataWithSummary(ownerId)
    expect(summary.deletedTransactions).toBeGreaterThanOrEqual(1)
    expect(summary.deletedAccounts).toBeGreaterThanOrEqual(1)
    expect(summary.deletedTaggedItems).toBeGreaterThanOrEqual(1)

    const ownerExport = await exportFinanceData(ownerId)
    expect(ownerExport.accounts).toHaveLength(0)
    expect(ownerExport.transactions).toHaveLength(0)
    expect(ownerExport.tags.length).toBeGreaterThanOrEqual(1)
    expect(ownerExport.plaidItems).toHaveLength(0)

    const otherExport = await exportFinanceData(otherUserId)
    expect(otherExport.accounts.length).toBeGreaterThanOrEqual(1)
    expect(otherExport.transactions.length).toBeGreaterThanOrEqual(1)
  })
})
