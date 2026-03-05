import crypto from 'node:crypto'

import { db, sql } from '@hominem/db'
import { createTestUser } from '@hominem/db/test/fixtures'

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
  const userIdSql = sql.join(userIds.map((id) => sql`${id}`), sql`, `)

  await db.execute(sql`delete from tagged_items where entity_type = 'finance_transaction' and entity_id in (select id from finance_transactions where user_id in (${userIdSql}))`).catch(() => {})
  await db.execute(sql`delete from finance_transactions where user_id in (${userIdSql})`).catch(() => {})
  await db.execute(sql`delete from plaid_items where user_id in (${userIdSql})`).catch(() => {})
  await db.execute(sql`delete from finance_accounts where user_id in (${userIdSql})`).catch(() => {})

  const accountIds = input.accountIds?.filter((id) => id.length > 0) ?? []
  if (accountIds.length > 0) {
    await db.execute(sql`delete from finance_accounts where id in (${sql.join(accountIds.map((id) => sql`${id}`), sql`, `)})`).catch(() => {})
  }

  const tagIds = input.tagIds?.filter((id) => id.length > 0) ?? []
  if (tagIds.length > 0) {
    await db.execute(sql`delete from tags where id in (${sql.join(tagIds.map((id) => sql`${id}`), sql`, `)})`).catch(() => {})
  }

  const institutionIds = (input.institutionIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0)
  if (institutionIds.length > 0) {
    await db.execute(sql`delete from financial_institutions where id in (${sql.join(institutionIds.map((id) => sql`${id}`), sql`, `)})`).catch(() => {})
  }

  await db.execute(sql`delete from users where id in (${userIdSql})`).catch(() => {})
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
  await db.execute(sql`
    insert into finance_accounts (
      id, user_id, name, account_type, institution_id, institution_name, balance, currency, is_active, data
    )
    values (
      ${input.id},
      ${input.userId},
      ${input.name},
      ${input.accountType ?? 'checking'},
      ${input.institutionId ?? null},
      ${input.institutionName ?? null},
      ${input.balance ?? '0.00'},
      ${input.currency ?? 'USD'},
      true,
      '{}'::jsonb
    )
  `)
}
