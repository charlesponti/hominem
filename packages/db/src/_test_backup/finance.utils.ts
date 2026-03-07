import crypto from 'node:crypto'

import { db, sql } from '../index'
import { createTestUser } from './fixtures'

export async function seedFinanceTestData({
  userId,
  accountId,
  institutionId,
  plaid = false,
}: {
  userId: string
  accountId: string
  institutionId: string
  plaid?: boolean
}): Promise<void> {
  await cleanupFinanceTestData({ userId, accountId, institutionId })

  await createTestUser({
    id: userId,
    email: `test-${userId.slice(0, 8)}@example.com`,
  })

  await db.execute(sql`
    insert into financial_institutions (id, name)
    values (${institutionId}, ${`Test Bank ${institutionId.slice(0, 8)}`})
    on conflict (id) do nothing
  `)

  await db.execute(sql`
    insert into finance_accounts (id, user_id, institution_id, name, account_type, balance, data)
    values (
      ${accountId},
      ${userId},
      ${institutionId},
      ${`Test Checking Account ${accountId.slice(0, 8)}`},
      ${'depository'},
      ${'5000.00'},
      ${JSON.stringify({})}::jsonb
    )
    on conflict (id) do nothing
  `)

  const fixtures = [
    { amount: '1000.00', date: '2023-01-15', description: 'Salary', transactionType: 'income', category: 'Salary', merchant: 'Employer' },
    { amount: '-300.00', date: '2023-01-20', description: 'Rent', transactionType: 'expense', category: 'Housing', merchant: 'Landlord' },
    { amount: '-100.00', date: '2023-01-25', description: 'Groceries', transactionType: 'expense', category: 'Food', merchant: 'Market' },
    { amount: '1200.00', date: '2023-02-15', description: 'Salary', transactionType: 'income', category: 'Salary', merchant: 'Employer' },
    { amount: '-350.00', date: '2023-02-20', description: 'Rent', transactionType: 'expense', category: 'Housing', merchant: 'Landlord' },
    { amount: '-150.00', date: '2023-02-25', description: 'Groceries', transactionType: 'expense', category: 'Food', merchant: 'Market' },
    { amount: '1100.00', date: '2023-03-15', description: 'Salary', transactionType: 'income', category: 'Salary', merchant: 'Employer' },
    { amount: '-400.00', date: '2023-03-20', description: 'Rent', transactionType: 'expense', category: 'Housing', merchant: 'Landlord' },
    { amount: '-200.00', date: '2023-03-25', description: 'Groceries', transactionType: 'expense', category: 'Food', merchant: 'Market' },
  ] as const

  for (const row of fixtures) {
    await db.execute(sql`
      insert into finance_transactions (
        id, user_id, account_id, amount, description, date, category, merchant_name, transaction_type
      )
      values (
        ${crypto.randomUUID()},
        ${userId},
        ${accountId},
        ${row.amount},
        ${row.description},
        ${row.date},
        ${row.category},
        ${row.merchant},
        ${row.transactionType}
      )
    `)
  }

  if (!plaid) {
    return
  }

  const plaidItemId = crypto.randomUUID()
  await db.execute(sql`
    insert into plaid_items (id, user_id, item_id, institution_id, access_token, status, last_synced_at)
    values (
      ${plaidItemId},
      ${userId},
      ${`item_test_${userId.slice(0, 8)}_123`},
      ${institutionId},
      ${`access-test-token-${userId.slice(0, 8)}-123`},
      ${'active'},
      ${null}
    )
    on conflict (id) do nothing
  `)

  const plaidAccounts = [
    {
      id: crypto.randomUUID(),
      name: 'Test Plaid Checking',
      plaidAccountId: `plaid-acc-checking-${userId.slice(0, 8)}-123`,
      balance: '2500.00',
    },
    {
      id: crypto.randomUUID(),
      name: 'Test Plaid Savings',
      plaidAccountId: `plaid-acc-savings-${userId.slice(0, 8)}-456`,
      balance: '10000.00',
    },
  ] as const

  for (const account of plaidAccounts) {
    await db.execute(sql`
      insert into finance_accounts (id, user_id, institution_id, name, account_type, balance, data)
      values (
        ${account.id},
        ${userId},
        ${institutionId},
        ${account.name},
        ${'depository'},
        ${account.balance},
        ${JSON.stringify({ plaidAccountId: account.plaidAccountId })}::jsonb
      )
      on conflict (id) do nothing
    `)
  }
}

export async function cleanupFinanceTestData({
  userId,
  accountId: _accountId,
  institutionId,
}: {
  userId: string
  accountId: string
  institutionId: string
}): Promise<void> {
  await db.execute(sql`delete from tagged_items where entity_type = ${'finance_transaction'} and entity_id in (select id from finance_transactions where user_id = ${userId})`).catch(() => {})
  await db.execute(sql`delete from finance_transactions where user_id = ${userId}`).catch(() => {})
  await db.execute(sql`delete from finance_accounts where user_id = ${userId}`).catch(() => {})
  await db.execute(sql`delete from plaid_items where user_id = ${userId}`).catch(() => {})
  await db.execute(sql`delete from financial_institutions where id = ${institutionId}`).catch(() => {})
  await db.execute(sql`delete from users where id = ${userId}`).catch(() => {})
}
