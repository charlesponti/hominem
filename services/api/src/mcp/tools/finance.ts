import { db, sql } from '@hominem/db';

import { MCP_SCOPES } from '../../auth/better-auth';
import { registerTool } from '../tools';
import {
  financeNetWorthInputSchema,
  financeNetWorthOutputSchema,
  financeRecentTransactionsInputSchema,
  financeRecentTransactionsOutputSchema,
  financeSpendingByCategoryInputSchema,
  financeSpendingByCategoryOutputSchema,
} from './finance-schemas';

function toCents(amount: number | string | null | undefined): number {
  return Math.round(Number(amount ?? 0) * 100);
}

function fallbackDate(daysAgo: number, now: Date): string {
  return new Date(now.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

// ── finance_net_worth ───────────────────────────────────────────────

registerTool(
  'finance_net_worth',
  {
    name: 'finance_net_worth',
    title: 'Finance Net Worth',
    description:
      'Compute current net worth from finance accounts included in net-worth totals, using the latest certified statement balance plus posted transaction activity since. Returns per-account balances grouped by currency.',
    inputSchema: financeNetWorthInputSchema,
    outputSchema: financeNetWorthOutputSchema,
    readOnly: true,
    scopes: MCP_SCOPES,
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const { includeClosed } = input as { includeClosed: boolean };
    const now = new Date();

    let accountsQuery = db
      .selectFrom('app.financeAccounts')
      .select([
        'id',
        'name',
        'accountType',
        'currencyCode',
        'lifecycleStatus',
        'institution',
        'includeInNetWorth',
      ])
      .where('userId', '=', ownerUserId)
      .where('includeInNetWorth', '=', true) as ReturnType<
      typeof db.selectFrom<'app.financeAccounts'>
    >;

    if (!includeClosed) {
      accountsQuery = accountsQuery.where(
        'lifecycleStatus',
        '!=',
        'closed',
      ) as typeof accountsQuery;
    }

    const accounts = (await accountsQuery.orderBy('name', 'asc').execute()) as Array<{
      id: string;
      name: string;
      accountType: string;
      currencyCode: string;
      lifecycleStatus: string;
      institution: string | null;
    }>;

    const warnings: string[] = [];
    const balances = await Promise.all(
      accounts.map(async (account) => {
        const latestStatement = (await db
          .selectFrom('app.financeStatementPeriods')
          .select(['closingBalance', 'periodEndOn'])
          .where('accountId', '=', account.id)
          .where('userId', '=', ownerUserId)
          .orderBy('periodEndOn', 'desc')
          .limit(1)
          .executeTakeFirst()) as
          | {
              closingBalance: number | string | null;
              periodEndOn: string | null;
            }
          | undefined;

        let ledgerQuery = db
          .selectFrom('app.financeTransactions')
          .select((eb) => [
            eb.fn.sum<number>('amount').as('delta'),
            eb.fn.max('postedOn').as('latestPostedOn'),
          ])
          .where('accountId', '=', account.id)
          .where('userId', '=', ownerUserId)
          .where('pending', '=', false);

        if (latestStatement) {
          ledgerQuery = ledgerQuery.where('postedOn', '>', latestStatement.periodEndOn as string);
        }

        const ledgerDelta = (await ledgerQuery.executeTakeFirst()) as
          | { delta: number | null; latestPostedOn: string | null }
          | undefined;

        const deltaCents = toCents(ledgerDelta?.delta ?? 0);
        const statementCents = toCents(latestStatement?.closingBalance ?? 0);
        const balanceCents = statementCents + deltaCents;
        const balanceAsOf = ledgerDelta?.latestPostedOn ?? latestStatement?.periodEndOn ?? null;

        if (!latestStatement && !ledgerDelta?.latestPostedOn) {
          warnings.push(`Account "${account.name}" has no statement periods or transactions.`);
        }

        return {
          accountId: account.id,
          name: account.name,
          institution: account.institution,
          accountType: account.accountType,
          currencyCode: account.currencyCode,
          balanceCents,
          balanceAsOf,
          balanceSource: (latestStatement ? 'statement+ledger' : 'ledger_only') as
            | 'statement+ledger'
            | 'ledger_only',
        };
      }),
    );

    const totalsByCurrency = new Map<string, { totalCents: number; accountCount: number }>();
    for (const balance of balances) {
      const existing = totalsByCurrency.get(balance.currencyCode) ?? {
        totalCents: 0,
        accountCount: 0,
      };
      existing.totalCents += balance.balanceCents;
      existing.accountCount += 1;
      totalsByCurrency.set(balance.currencyCode, existing);
    }

    return {
      asOf: now.toISOString(),
      totals: [...totalsByCurrency.entries()].map(([code, t]) => ({
        currencyCode: code,
        ...t,
      })),
      accounts: balances,
      warnings,
    };
  },
);

// ── finance_recent_transactions ─────────────────────────────────────

registerTool(
  'finance_recent_transactions',
  {
    name: 'finance_recent_transactions',
    title: 'Finance Recent Transactions',
    description:
      'List posted finance transactions in a bounded window, optionally scoped to one account, with category annotations where available.',
    inputSchema: financeRecentTransactionsInputSchema,
    outputSchema: financeRecentTransactionsOutputSchema,
    readOnly: true,
    scopes: MCP_SCOPES,
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const { accountId, from, to, limit } = input as {
      accountId?: string;
      from?: string;
      to?: string;
      limit: number;
    };

    let query = db
      .selectFrom('app.financeTransactions as t')
      .innerJoin('app.financeAccounts as a', 'a.id', 't.accountId')
      .leftJoin('app.financeCategories as c', 'c.id', 't.categoryId')
      .select([
        't.id',
        't.accountId',
        'a.name as accountName',
        't.postedOn',
        't.description',
        't.amount',
        't.currencyCode',
        't.categoryId',
        'c.name as categoryName',
        't.excluded',
        't.transactionType',
      ])
      .where('t.userId', '=', ownerUserId)
      .where('t.pending', '=', false);

    if (accountId !== undefined) {
      query = query.where('t.accountId', '=', accountId);
    }
    if (from !== undefined) {
      query = query.where('t.postedOn', '>=', from);
    }
    if (to !== undefined) {
      query = query.where('t.postedOn', '<=', to);
    }

    const rows = (await query
      .orderBy('t.postedOn', 'desc')
      .orderBy('t.id', 'desc')
      .limit(limit)
      .execute()) as Array<{
      id: string;
      accountId: string;
      accountName: string;
      postedOn: string;
      description: string;
      amount: number | string;
      currencyCode: string;
      categoryId: string | null;
      categoryName: string | null;
      excluded: boolean;
      transactionType: string;
    }>;

    const transactions = rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      accountName: row.accountName,
      postedOn: row.postedOn,
      description: row.description,
      amountCents: toCents(row.amount),
      currencyCode: row.currencyCode,
      categoryId: row.categoryId ?? null,
      categoryName: row.categoryName ?? null,
      excluded: row.excluded === true,
      transactionType: row.transactionType,
    }));

    return { transactions, count: transactions.length };
  },
);

// ── finance_spending_by_category ────────────────────────────────────

registerTool(
  'finance_spending_by_category',
  {
    name: 'finance_spending_by_category',
    title: 'Finance Spending by Category',
    description:
      'Sum posted, non-excluded, non-transfer spending grouped by category over a date range. Returns spend totals in cents.',
    inputSchema: financeSpendingByCategoryInputSchema,
    outputSchema: financeSpendingByCategoryOutputSchema,
    readOnly: true,
    scopes: MCP_SCOPES,
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const { from, to, limit } = input as {
      from?: string;
      to?: string;
      limit: number;
    };
    const now = new Date();
    const fromDate = from ?? fallbackDate(30, now);
    const toDate = to ?? now.toISOString().slice(0, 10);

    const currencyRows = (await db
      .selectFrom('app.financeTransactions')
      .select('currencyCode')
      .distinct()
      .where('userId', '=', ownerUserId)
      .where('pending', '=', false)
      .where(sql<boolean>`amount < 0`)
      .where('excluded', '=', false)
      .where('transactionType', '!=', 'transfer')
      .where('postedOn', '>=', fromDate)
      .where('postedOn', '<=', toDate)
      .execute()) as Array<{ currencyCode: string }>;

    const warnings: string[] = [];
    let currencyCode: string | null = null;
    if (currencyRows.length === 1) {
      currencyCode = currencyRows[0]?.currencyCode ?? null;
    } else if (currencyRows.length > 1) {
      warnings.push(
        'Spending spans multiple currencies; amounts were not converted or summed across currencies.',
      );
    }

    const rows = (await db
      .selectFrom('app.financeTransactions as t')
      .innerJoin('app.financeCategories as c', 'c.id', 't.categoryId')
      .select((eb) => [
        'c.id as categoryId',
        'c.name as categoryName',
        eb.fn.sum<number>('t.amount').as('netAmount'),
        eb.fn.countAll<number>().as('transactionCount'),
      ])
      .where('t.userId', '=', ownerUserId)
      .where('t.pending', '=', false)
      .where(sql<boolean>`t.amount < 0`)
      .where('t.excluded', '=', false)
      .where('t.transactionType', '!=', 'transfer')
      .where('t.postedOn', '>=', fromDate)
      .where('t.postedOn', '<=', toDate)
      .groupBy(['c.id', 'c.name'])
      .orderBy('netAmount', 'asc')
      .limit(limit)
      .execute()) as Array<{
      categoryId: string;
      categoryName: string;
      netAmount: number | null;
      transactionCount: number;
    }>;

    const categories = rows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      spentCents: Math.abs(toCents(row.netAmount)),
      transactionCount: Number(row.transactionCount),
    }));

    return {
      from: fromDate,
      to: toDate,
      currencyCode,
      categories,
      warnings,
    };
  },
);
