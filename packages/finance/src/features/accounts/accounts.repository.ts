import type {
  FinanceAccountOutput,
  FinanceAccountInput,
  FinanceTransactionOutput,
} from '@hominem/db/types/finance';

import { db } from '@hominem/db';
import { financeAccounts, financialInstitutions, plaidItems } from '@hominem/db/schema/finance';
import { and, eq, sql } from 'drizzle-orm';
import crypto from 'node:crypto';

import type {
  AccountWithPlaidInfo,
  BalanceSummary,
  CreateAccountInput,
  InstitutionConnection,
  PlaidConnection,
  UpdateAccountInput,
} from './accounts.domain';

/**
 * Repository for Accounts
 * Encapsulates all Database (Drizzle) access.
 * Always returns Domain models, hiding DB internal types.
 */
export const AccountsRepository = {
  async create(input: CreateAccountInput): Promise<FinanceAccountOutput> {
    const [created] = await db
      .insert(financeAccounts)
      .values({
        id: input.id ?? crypto.randomUUID(),
        ...input,
      } as FinanceAccountInput)
      .returning();

    if (!created) {
      throw new Error(`Failed to create account: ${input.name}`);
    }

    return created as FinanceAccountOutput;
  },

  async createMany(inputs: CreateAccountInput[]): Promise<FinanceAccountOutput[]> {
    if (inputs.length === 0) return [];

    const data = inputs.map((input) => ({
      id: input.id ?? crypto.randomUUID(),
      ...input,
    }));

    const result = await db
      .insert(financeAccounts)
      .values(data as FinanceAccountInput[])
      .returning();

    return result as FinanceAccountOutput[];
  },

  async list(userId: string): Promise<FinanceAccountOutput[]> {
    return (await db.query.financeAccounts.findMany({
      where: eq(financeAccounts.userId, userId),
      orderBy: (accounts) => accounts.name,
    })) as FinanceAccountOutput[];
  },

  async getById(id: string, userId: string): Promise<FinanceAccountOutput | null> {
    const result = await db.query.financeAccounts.findFirst({
      where: and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
    });
    return (result as FinanceAccountOutput) ?? null;
  },

  async update(
    id: string,
    userId: string,
    updates: UpdateAccountInput,
  ): Promise<FinanceAccountOutput> {
    const [updated] = await db
      .update(financeAccounts)
      .set(updates as Partial<FinanceAccountInput>)
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error(`Account not found or not updated: ${id}`);
    }

    return updated as FinanceAccountOutput;
  },

  async delete(id: string, userId: string): Promise<void> {
    await db
      .delete(financeAccounts)
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)));
  },

  async findByNameForUser(userId: string, name: string): Promise<FinanceAccountOutput | null> {
    const result = await db.query.financeAccounts.findFirst({
      where: and(eq(financeAccounts.userId, userId), eq(financeAccounts.name, name)),
    });
    return (result as FinanceAccountOutput) ?? null;
  },

  async getWithPlaidInfo(accountId: string, userId: string): Promise<AccountWithPlaidInfo | null> {
    const [account] = await db
      .select({
        // Extract all core fields
        id: financeAccounts.id,
        userId: financeAccounts.userId,
        name: financeAccounts.name,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
        interestRate: financeAccounts.interestRate,
        minimumPayment: financeAccounts.minimumPayment,
        institutionId: financeAccounts.institutionId,
        plaidAccountId: financeAccounts.plaidAccountId,
        plaidItemId: financeAccounts.plaidItemId,
        mask: financeAccounts.mask,
        isoCurrencyCode: financeAccounts.isoCurrencyCode,
        subtype: financeAccounts.subtype,
        officialName: financeAccounts.officialName,
        limit: financeAccounts.limit,
        lastUpdated: financeAccounts.lastUpdated,
        createdAt: financeAccounts.createdAt,
        updatedAt: financeAccounts.updatedAt,
        // Join fields
        institutionName: financialInstitutions.name,
        institutionLogo: financialInstitutions.logo,
        isPlaidConnected: sql<boolean>` ${financeAccounts.plaidItemId} IS NOT NULL`,
        plaidItemStatus: plaidItems.status,
        plaidItemError: plaidItems.error,
        plaidLastSyncedAt: plaidItems.lastSyncedAt,
        plaidItemInternalId: plaidItems.id,
        plaidInstitutionId: plaidItems.institutionId,
        plaidInstitutionName: financialInstitutions.name,
      })
      .from(financeAccounts)
      .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
      .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
      .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId)));

    return (account as AccountWithPlaidInfo) ?? null;
  },

  async listWithPlaidInfo(userId: string): Promise<AccountWithPlaidInfo[]> {
    const result = await db
      .select({
        id: financeAccounts.id,
        userId: financeAccounts.userId,
        name: financeAccounts.name,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
        interestRate: financeAccounts.interestRate,
        minimumPayment: financeAccounts.minimumPayment,
        institutionId: financeAccounts.institutionId,
        plaidAccountId: financeAccounts.plaidAccountId,
        plaidItemId: financeAccounts.plaidItemId,
        mask: financeAccounts.mask,
        isoCurrencyCode: financeAccounts.isoCurrencyCode,
        subtype: financeAccounts.subtype,
        officialName: financeAccounts.officialName,
        limit: financeAccounts.limit,
        lastUpdated: financeAccounts.lastUpdated,
        createdAt: financeAccounts.createdAt,
        updatedAt: financeAccounts.updatedAt,
        institutionName: financialInstitutions.name,
        institutionLogo: financialInstitutions.logo,
        isPlaidConnected: sql<boolean>` ${financeAccounts.plaidItemId} IS NOT NULL`,
        plaidItemStatus: plaidItems.status,
        plaidItemError: plaidItems.error,
        plaidLastSyncedAt: plaidItems.lastSyncedAt,
        plaidItemInternalId: plaidItems.id,
        plaidInstitutionId: plaidItems.institutionId,
        plaidInstitutionName: financialInstitutions.name,
      })
      .from(financeAccounts)
      .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
      .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
      .where(eq(financeAccounts.userId, userId));

    return result as AccountWithPlaidInfo[];
  },

  async listWithRecentTransactions(
    userId: string,
    transactionLimit = 5,
  ): Promise<Array<FinanceAccountOutput & { transactions: FinanceTransactionOutput[] }>> {
    const query = sql`
      WITH ranked_transactions AS (
        SELECT
          t.*,
          ROW_NUMBER() OVER (PARTITION BY t.account_id ORDER BY t.date DESC) as rn
        FROM transactions t
        WHERE t.user_id = ${userId} AND t.excluded = false AND t.pending = false
      ),
      recent_transactions AS (
        SELECT
          rt.account_id,
          json_agg(json_build_object(
            'id', rt.id,
            'type', rt.type,
            'amount', rt.amount,
            'date', rt.date,
            'description', rt.description,
            'merchantName', rt.merchant_name,
            'accountId', rt.account_id,
            'fromAccountId', rt.from_account_id,
            'toAccountId', rt.to_account_id,
            'status', rt.status,
            'category', rt.category,
            'parentCategory', rt.parent_category,
            'excluded', rt.excluded,
            'tags', rt.tags,
            'accountMask', rt.account_mask,
            'note', rt.note,
            'recurring', rt.recurring,
            'pending', rt.pending,
            'paymentChannel', rt.payment_channel,
            'location', rt.location,
            'source', rt.source,
            'createdAt', rt.created_at,
            'updatedAt', rt.updated_at,
            'userId', rt.user_id
          ) ORDER BY rt.date DESC) as transactions
        FROM ranked_transactions rt
        WHERE rt.rn <= ${transactionLimit}
        GROUP BY rt.account_id
      )
      SELECT
        fa.*,
        COALESCE(rt.transactions, '[]'::json) as transactions
      FROM finance_accounts fa
      LEFT JOIN recent_transactions rt ON fa.id = rt.account_id
      WHERE fa.user_id = ${userId}
      ORDER BY fa.name;
    `;
    const result = (await db.execute(query)) as unknown as Array<
      Record<string, unknown> & { transactions: FinanceTransactionOutput[] }
    >;

    return result.map((account) => ({
      ...account,
      transactions: account.transactions || [],
    })) as Array<FinanceAccountOutput & { transactions: FinanceTransactionOutput[] }>;
  },

  async getBalanceSummary(userId: string): Promise<BalanceSummary> {
    const accounts = await db
      .select({
        id: financeAccounts.id,
        name: financeAccounts.name,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
      })
      .from(financeAccounts)
      .where(eq(financeAccounts.userId, userId));

    const totalBalance = accounts.reduce((sum: number, account) => {
      return sum + Number.parseFloat(account.balance || '0');
    }, 0);

    return {
      accounts,
      totalBalance: totalBalance.toFixed(2),
      accountCount: accounts.length,
    };
  },

  async listPlaidConnections(userId: string): Promise<PlaidConnection[]> {
    const result = await db
      .select({
        id: plaidItems.id,
        itemId: plaidItems.itemId,
        institutionId: plaidItems.institutionId,
        institutionName: financialInstitutions.name,
        status: plaidItems.status,
        lastSyncedAt: plaidItems.lastSyncedAt,
        error: plaidItems.error,
        createdAt: plaidItems.createdAt,
      })
      .from(plaidItems)
      .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
      .where(eq(plaidItems.userId, userId));

    return result;
  },

  async getAccountsForInstitution(
    userId: string,
    institutionId: string,
  ): Promise<AccountWithPlaidInfo[]> {
    const result = await db
      .select({
        id: financeAccounts.id,
        userId: financeAccounts.userId,
        name: financeAccounts.name,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
        interestRate: financeAccounts.interestRate,
        minimumPayment: financeAccounts.minimumPayment,
        institutionId: financeAccounts.institutionId,
        plaidAccountId: financeAccounts.plaidAccountId,
        plaidItemId: financeAccounts.plaidItemId,
        mask: financeAccounts.mask,
        isoCurrencyCode: financeAccounts.isoCurrencyCode,
        subtype: financeAccounts.subtype,
        officialName: financeAccounts.officialName,
        limit: financeAccounts.limit,
        lastUpdated: financeAccounts.lastUpdated,
        createdAt: financeAccounts.createdAt,
        updatedAt: financeAccounts.updatedAt,
        institutionName: financialInstitutions.name,
        institutionLogo: financialInstitutions.logo,
        isPlaidConnected: sql<boolean>` ${financeAccounts.plaidItemId} IS NOT NULL`,
        plaidItemStatus: plaidItems.status,
        plaidItemError: plaidItems.error,
        plaidLastSyncedAt: plaidItems.lastSyncedAt,
        plaidItemInternalId: plaidItems.id,
        plaidInstitutionId: plaidItems.institutionId,
        plaidInstitutionName: financialInstitutions.name,
      })
      .from(financeAccounts)
      .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
      .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
      .where(
        and(eq(financeAccounts.userId, userId), eq(financeAccounts.institutionId, institutionId)),
      );

    return result as AccountWithPlaidInfo[];
  },

  async listInstitutionConnections(userId: string): Promise<InstitutionConnection[]> {
    const result = await db
      .select({
        institutionId: financialInstitutions.id,
        institutionName: financialInstitutions.name,
        institutionLogo: financialInstitutions.logo,
        institutionUrl: financialInstitutions.url,
        status: plaidItems.status,
        lastSyncedAt: plaidItems.lastSyncedAt,
        error: plaidItems.error,
        accountCount: sql<number>`COUNT(DISTINCT ${financeAccounts.id})`,
        isPlaidConnected: sql<boolean>`${plaidItems.id} IS NOT NULL`,
      })
      .from(financialInstitutions)
      .leftJoin(
        plaidItems,
        and(eq(financialInstitutions.id, plaidItems.institutionId), eq(plaidItems.userId, userId)),
      )
      .leftJoin(
        financeAccounts,
        and(
          eq(financialInstitutions.id, financeAccounts.institutionId),
          eq(financeAccounts.userId, userId),
        ),
      )
      .where(sql`${financeAccounts.userId} = ${userId} OR ${plaidItems.userId} = ${userId}`)
      .groupBy(
        financialInstitutions.id,
        financialInstitutions.name,
        financialInstitutions.logo,
        financialInstitutions.url,
        plaidItems.status,
        plaidItems.lastSyncedAt,
        plaidItems.error,
        plaidItems.id,
      );

    return result.map((conn) => ({
      ...conn,
      status: (conn.status || 'active') as 'active' | 'error' | 'pending_expiration' | 'revoked',
    })) as InstitutionConnection[];
  },
};
