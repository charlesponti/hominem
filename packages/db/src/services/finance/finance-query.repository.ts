import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type {
  AppFinanceAccounts,
  AppFinanceInstitutions,
  AppFinanceTransactions,
} from '../../types/database';

type FinanceAccountRow = Selectable<AppFinanceAccounts>;
type FinanceInstitutionRow = Selectable<AppFinanceInstitutions>;
type FinanceTransactionRow = Selectable<AppFinanceTransactions>;

export interface FinanceMonthlyTransactionRecord {
  transactionId: FinanceTransactionRow['id'];
  accountId: FinanceTransactionRow['accountId'];
  accountName: FinanceAccountRow['name'];
  currencyCode: FinanceAccountRow['currencyCode'];
  institutionName: FinanceInstitutionRow['name'] | null;
  postedOn: FinanceTransactionRow['postedOn'];
  amount: number;
  transactionType: FinanceTransactionRow['transactionType'];
  merchantName: FinanceTransactionRow['merchantName'];
}

export const FinanceQueryRepository = {
  async listMonthlyTransactions(
    handle: DbHandle,
    ownerUserId: string,
    range: { startsOn: string; endsBefore: string },
  ): Promise<FinanceMonthlyTransactionRecord[]> {
    const rows = await handle
      .selectFrom('app.financeTransactions as transaction')
      .innerJoin('app.financeAccounts as account', 'account.id', 'transaction.accountId')
      .leftJoin('app.financeInstitutions as institution', 'institution.id', 'account.institutionId')
      .select([
        'transaction.id as transactionId',
        'transaction.accountId as accountId',
        'account.name as accountName',
        'account.currencyCode as currencyCode',
        'institution.name as institutionName',
        'transaction.postedOn as postedOn',
        'transaction.amount as amount',
        'transaction.transactionType as transactionType',
        'transaction.merchantName as merchantName',
      ])
      .where('transaction.userId', '=', ownerUserId)
      .where('account.userId', '=', ownerUserId)
      .where('transaction.postedOn', '>=', range.startsOn)
      .where('transaction.postedOn', '<', range.endsBefore)
      .orderBy('transaction.postedOn', 'asc')
      .orderBy('transaction.id', 'asc')
      .execute();

    return rows.map((row) => ({
      transactionId: row.transactionId,
      accountId: row.accountId,
      accountName: row.accountName,
      currencyCode: row.currencyCode,
      institutionName: row.institutionName,
      postedOn: String(row.postedOn),
      amount: typeof row.amount === 'number' ? row.amount : Number(row.amount ?? 0),
      transactionType: row.transactionType,
      merchantName: row.merchantName,
    }));
  },
};
