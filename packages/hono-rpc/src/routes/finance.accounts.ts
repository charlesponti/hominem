import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'
import { randomUUID } from 'crypto'
import { db } from '@hominem/db'
import type { Selectable } from 'kysely'
import type { Database } from '@hominem/db'
import { NotFoundError } from '../errors'

import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  accountCreateSchema,
  accountDeleteSchema,
  accountGetSchema,
  accountListSchema,
  accountUpdateSchema,
  institutionAccountsSchema,
} from '../schemas/finance.accounts.schema'
import type {
  AccountAllOutput,
  AccountConnectionsOutput,
  AccountCreateOutput,
  AccountDeleteOutput,
  AccountGetOutput,
  AccountInstitutionAccountsOutput,
  AccountListOutput,
  AccountUpdateOutput,
  AccountsWithPlaidOutput,
} from '../types/finance/accounts.types'
import type { AccountData, AccountType, PlaidConnection, TransactionData } from '../types/finance/shared.types'
import type { TransactionType } from '../types/finance/shared.types'

const emptyBodySchema = z.object({})

function normalizeAccountType(value: string): AccountType {
  if (
    value === 'checking' ||
    value === 'savings' ||
    value === 'credit' ||
    value === 'investment' ||
    value === 'cash' ||
    value === 'other'
  ) {
    return value
  }
  return 'other'
}

function toAccountData(row: Selectable<Database['finance_accounts']>): AccountData {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    accountType: normalizeAccountType(row.account_type),
    balance: row.balance ? Number(row.balance) : 0,
  }
}

function toTransactionData(row: Selectable<Database['finance_transactions']>): TransactionData {
  const amount = typeof row.amount === 'string' ? Number.parseFloat(row.amount) : Number(row.amount)
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    amount,
    description: row.description ?? '',
    date: row.date instanceof Date ? row.date.toISOString() : row.date,
    type: (amount < 0 ? 'expense' : 'income') as TransactionType,
  }
}

// Helper to get account with ownership check
async function getAccountWithOwnershipCheck(accountId: string, userId: string) {
  const account = await db
    .selectFrom('finance_accounts')
    .selectAll()
    .where((eb) => eb.and([eb('id', '=', accountId), eb('user_id', '=', userId)]))
    .executeTakeFirst()

  if (!account) {
    throw new NotFoundError('Account not found')
  }
  return account
}

// Helper to get transactions for an account
async function getTransactionsForAccount(accountId: string, limit: number = 200, offset: number = 0) {
  return db
    .selectFrom('finance_transactions')
    .selectAll()
    .where('account_id', '=', accountId)
    .orderBy('date', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()
}

export const accountsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', accountListSchema), async (c) => {
    const userId = c.get('userId')!
    const accounts = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute()
    return c.json<AccountListOutput>(accounts.map(toAccountData), 200)
  })
  .post('/get', authMiddleware, zValidator('json', accountGetSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const account = await getAccountWithOwnershipCheck(input.id, userId)
    const transactions = await getTransactionsForAccount(input.id, 200, 0)
    return c.json<AccountGetOutput>({
      ...toAccountData(account),
      institutionName: (account as any).institution_name ?? null,
      plaidAccountId: (account as any).plaid_account_id ?? null,
      plaidItemId: null,
      transactions: transactions.map(toTransactionData),
    })
  })
  .post('/create', authMiddleware, zValidator('json', accountCreateSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const accountId = randomUUID()
    const now = new Date().toISOString()

    await db
      .insertInto('finance_accounts')
      .values({
        id: accountId,
        user_id: userId,
        name: input.name,
        account_type: input.type,
        balance: input.balance === undefined ? 0 : Number(input.balance),
        created_at: now,
        updated_at: now,
      })
      .execute()

    const created = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('id', '=', accountId)
      .executeTakeFirst()

    if (!created) throw new NotFoundError('Account not found after creation')
    return c.json<AccountCreateOutput>(toAccountData(created), 201)
  })
  .post('/update', authMiddleware, zValidator('json', accountUpdateSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')

    await getAccountWithOwnershipCheck(input.id, userId)

    const now = new Date().toISOString()
    const updateValues: Record<string, any> = { updated_at: now }

    if (input.name !== undefined) updateValues.name = input.name
    if (input.type !== undefined) updateValues.account_type = input.type
    if (input.balance !== undefined) updateValues.balance = Number(input.balance)

    await db.updateTable('finance_accounts').set(updateValues).where('id', '=', input.id).execute()

    const updated = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('id', '=', input.id)
      .executeTakeFirst()

    if (!updated) throw new NotFoundError('Account not found after update')
    return c.json<AccountUpdateOutput>(toAccountData(updated), 200)
  })
  .post('/delete', authMiddleware, zValidator('json', accountDeleteSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')

    await getAccountWithOwnershipCheck(input.id, userId)

    // Delete associated transactions first
    await db.deleteFrom('finance_transactions').where('account_id', '=', input.id).execute()

    // Delete the account
    await db.deleteFrom('finance_accounts').where('id', '=', input.id).execute()

    return c.json<AccountDeleteOutput>({ success: true }, 200)
  })
  .post('/with-plaid', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!
    const accounts = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute()

    return c.json<AccountsWithPlaidOutput>(
      accounts.map((account) => ({
        ...toAccountData(account),
        institutionName: (account as any).institution_name ?? null,
        plaidAccountId: (account as any).plaid_account_id ?? null,
        plaidItemId: null,
      })),
      200,
    )
  })
  .post('/connections', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!

    // Get Plaid connections from PlaidItems table
    const connections = await db
      .selectFrom('plaid_items')
      .selectAll()
      .where('user_id', '=', userId)
      .execute()

    // Get accounts with institution info
    const institutions = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('user_id', '=', userId)
      .execute()

    const institutionNames = new Map<string, string>()
    for (const account of institutions) {
      if (account.id && account.name) {
        institutionNames.set(account.id, account.name)
      }
    }

    const result: AccountConnectionsOutput = connections.map((connection): PlaidConnection => ({
      id: (connection as any).id,
      institutionId: (connection as any).institution_id ?? '',
      institutionName: (connection as any).institution_id
        ? institutionNames.get((connection as any).institution_id) ?? 'Institution'
        : 'Institution',
      institutionLogo: null,
      status:
        (connection as any).error
          ? 'error'
          : (connection as any).cursor
            ? 'disconnected'
            : 'active',
      lastSynced: (connection as any).created_at ?? new Date(0).toISOString(),
      accounts: 0,
    }))

    return c.json<AccountConnectionsOutput>(result, 200)
  })
  .post(
    '/institution-accounts',
    authMiddleware,
    zValidator('json', institutionAccountsSchema),
    async (c) => {
      const userId = c.get('userId')!
      const input = c.req.valid('json')
      const accounts = await db
        .selectFrom('finance_accounts')
        .selectAll()
        .where((eb) =>
          eb.and([
            eb('user_id', '=', userId),
            eb('institution_id', '=', input.institutionId),
          ])
        )
        .execute()

      return c.json<AccountInstitutionAccountsOutput>(
        accounts.map((account) => ({
          ...toAccountData(account),
          institutionName: (account as any).institution_name ?? null,
          plaidAccountId: (account as any).plaid_account_id ?? null,
          plaidItemId: null,
        })),
        200,
      )
    },
  )
  .post('/all', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!

    const [accounts, connections] = await Promise.all([
      db
        .selectFrom('finance_accounts')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .execute(),
      db
        .selectFrom('plaid_items')
        .selectAll()
        .where('user_id', '=', userId)
        .execute(),
    ])

    const payload: AccountAllOutput = {
      accounts: accounts.map((account) => ({
        ...toAccountData(account),
        institutionName: (account as any).institution_name ?? null,
        plaidAccountId: (account as any).plaid_account_id ?? null,
        plaidItemId: null,
        transactions: [],
      })),
      connections: connections.map((connection) => ({
        id: (connection as any).id,
        institutionId: (connection as any).institution_id ?? '',
        institutionName: 'Institution',
        institutionLogo: null,
        status:
          (connection as any).error
            ? 'error'
            : (connection as any).cursor
              ? 'disconnected'
              : 'active',
        lastSynced: (connection as any).created_at ?? new Date(0).toISOString(),
        accounts: 0,
      })),
    }
    return c.json<AccountAllOutput>(payload, 200)
  })
