import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'
import {
  createAccount,
  deleteAccount,
  getAccountById,
  getAccountsForInstitution,
  listAccounts,
  listAccountsWithPlaidInfo,
  listPlaidConnectionsForUser,
  queryTransactionsByContract,
  updateAccount,
} from '@hominem/finance-services'

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
import { NotFoundError } from '../errors'

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

function toAccountData(input: {
  id: string
  userId: string
  name: string
  type: string
  balance: number
}): AccountData {
  return {
    id: input.id,
    userId: input.userId,
    name: input.name,
    accountType: normalizeAccountType(input.type),
    balance: input.balance,
  }
}

function toTransactionData(input: {
  id: string
  userId: string
  accountId: string
  amount: number
  description: string | null
  date: string
}): TransactionData {
  return {
    id: input.id,
    userId: input.userId,
    accountId: input.accountId,
    amount: input.amount,
    description: input.description ?? '',
    date: input.date,
    type: (input.amount < 0 ? 'expense' : 'income') as TransactionType,
  }
}

export const accountsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', accountListSchema), async (c) => {
    const userId = c.get('userId')!
    const accounts = await listAccounts(userId)
    return c.json<AccountListOutput>(accounts.map(toAccountData), 200)
  })
  .post('/get', authMiddleware, zValidator('json', accountGetSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const account = await getAccountById(input.id, userId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }
    const transactions = await queryTransactionsByContract({
      userId,
      accountId: input.id,
      limit: 200,
      offset: 0,
    })
    return c.json<AccountGetOutput>({
      ...toAccountData(account),
      institutionName: null,
      plaidAccountId: account.plaidAccountId ?? null,
      plaidItemId: null,
      transactions: transactions.map(toTransactionData),
    })
  })
  .post('/create', authMiddleware, zValidator('json', accountCreateSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const created = await createAccount({
      userId,
      name: input.name,
      type: input.type,
      balance: input.balance === undefined ? 0 : Number(input.balance),
    })
    return c.json<AccountCreateOutput>(toAccountData(created), 201)
  })
  .post('/update', authMiddleware, zValidator('json', accountUpdateSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const updated = await updateAccount({
      id: input.id,
      userId,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.balance !== undefined ? { balance: Number(input.balance) } : {}),
    })
    if (!updated) {
      throw new NotFoundError('Account not found')
    }
    return c.json<AccountUpdateOutput>(toAccountData(updated), 200)
  })
  .post('/delete', authMiddleware, zValidator('json', accountDeleteSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const deleted = await deleteAccount(input.id, userId)
    if (!deleted) {
      throw new NotFoundError('Account not found')
    }
    return c.json<AccountDeleteOutput>({ success: true }, 200)
  })
  .post('/with-plaid', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!
    const accounts = await listAccountsWithPlaidInfo(userId)
    return c.json<AccountsWithPlaidOutput>(
      accounts.map((account) => ({
        ...toAccountData(account),
        institutionName: null,
        plaidAccountId: account.plaidAccountId ?? null,
        plaidItemId: null,
      })),
      200,
    )
  })
  .post('/connections', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!
    const [connections, institutions] = await Promise.all([
      listPlaidConnectionsForUser(userId),
      listAccountsWithPlaidInfo(userId),
    ])

    const institutionNames = new Map<string, string>()
    for (const account of institutions) {
      if (account.id && account.name) {
        institutionNames.set(account.id, account.name)
      }
    }

    const result: AccountConnectionsOutput = connections.map((connection): PlaidConnection => ({
      id: connection.id,
      institutionId: connection.institutionId ?? '',
      institutionName: connection.institutionId
        ? institutionNames.get(connection.institutionId) ?? 'Institution'
        : 'Institution',
      institutionLogo: null,
      status:
        connection.status === 'error'
          ? 'error'
          : connection.status === 'disconnected'
            ? 'disconnected'
            : 'active',
      lastSynced: connection.lastSyncedAt ?? new Date(0).toISOString(),
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
      const accounts = await getAccountsForInstitution(input.institutionId, userId)
      return c.json<AccountInstitutionAccountsOutput>(
        accounts.map((account) => ({
          ...toAccountData(account),
          institutionName: null,
          plaidAccountId: account.plaidAccountId ?? null,
          plaidItemId: null,
        })),
        200,
      )
    },
  )
  .post('/all', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!
    const [accounts, connections] = await Promise.all([
      listAccountsWithPlaidInfo(userId),
      listPlaidConnectionsForUser(userId),
    ])
    const payload: AccountAllOutput = {
      accounts: accounts.map((account) => ({
        ...toAccountData(account),
        institutionName: null,
        plaidAccountId: account.plaidAccountId ?? null,
        plaidItemId: null,
        transactions: [],
      })),
      connections: connections.map((connection) => ({
        id: connection.id,
        institutionId: connection.institutionId ?? '',
        institutionName: 'Institution',
        institutionLogo: null,
        status:
          connection.status === 'error'
            ? 'error'
            : connection.status === 'disconnected'
              ? 'disconnected'
              : 'active',
        lastSynced: connection.lastSyncedAt ?? new Date(0).toISOString(),
        accounts: 0,
      })),
    }
    return c.json<AccountAllOutput>(payload, 200)
  })
