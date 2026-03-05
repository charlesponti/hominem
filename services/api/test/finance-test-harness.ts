import crypto from 'node:crypto'

import { db, inArray, sql } from '@hominem/db'
import { createTestUser } from '@hominem/db/test/fixtures'
import { financeAccounts } from '@hominem/db/schema/finance'
import { taggedItems, tags } from '@hominem/db/schema/tags'

export interface FinanceUserPair {
  ownerId: string
  otherUserId: string
}

export async function createFinanceUser(label: 'owner' | 'other' | 'test' = 'test'): Promise<string> {
  const userId = crypto.randomUUID()
  await createTestUser({
    id: userId,
    email: `${label}-${userId.slice(0, 8)}@example.com`,
  })
  return userId
}

export async function createFinanceUserPair(): Promise<FinanceUserPair> {
  const ownerId = await createFinanceUser('owner')
  const otherUserId = await createFinanceUser('other')

  return { ownerId, otherUserId }
}

export async function cleanupFinanceUserData(input: {
  userIds: string[]
  accountIds?: string[]
  institutionIds?: Array<string | null>
  tagIds?: string[]
}): Promise<void> {
  const userIds = input.userIds
  if (userIds.length === 0) {
    return
  }

  await db
    .delete(taggedItems)
    .where(sql`entity_type = 'finance_transaction' and entity_id in (select id from finance_transactions where user_id in (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)}))`)
    .catch(() => {})
  await db.execute(sql`delete from finance_transactions where user_id in (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`).catch(() => {})
  await db.execute(sql`delete from plaid_items where user_id in (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`).catch(() => {})
  await db.execute(sql`delete from finance_accounts where user_id in (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`).catch(() => {})

  const accountIds = input.accountIds?.filter((id) => id.length > 0) ?? []
  if (accountIds.length > 0) {
    await db.delete(financeAccounts).where(inArray(financeAccounts.id, accountIds)).catch(() => {})
  }

  const tagIds = input.tagIds?.filter((id) => id.length > 0) ?? []
  if (tagIds.length > 0) {
    await db.delete(tags).where(inArray(tags.id, tagIds)).catch(() => {})
  }

  const institutionIds = (input.institutionIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0)
  if (institutionIds.length > 0) {
    await db.execute(sql`delete from financial_institutions where id in (${sql.join(institutionIds.map((id) => sql`${id}`), sql`, `)})`).catch(() => {})
  }

  await db.execute(sql`delete from users where id in (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`).catch(() => {})
}

export async function createFinanceAccountFixture(input: {
  id: string
  userId: string
  name: string
  accountType?: string
  balance?: string
  currency?: string
  institutionId?: string
  institutionName?: string
}): Promise<void> {
  await db.insert(financeAccounts).values({
    id: input.id,
    userId: input.userId,
    name: input.name,
    accountType: input.accountType ?? 'checking',
    institutionId: input.institutionId ?? null,
    institutionName: input.institutionName ?? null,
    balance: input.balance ?? '0.00',
    currency: input.currency ?? 'USD',
    isActive: true,
    data: {},
  })
}
