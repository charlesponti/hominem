import { db, FinanceQueryRepository, ValidationError } from '@hominem/db';

export interface FinanceMonthlySummaryInput {
  ownerUserId: string;
  month: string;
  limit?: number;
}

export interface FinanceMonthlySummary {
  month: string;
  startsOn: string;
  endsBefore: string;
  currencyCode: string;
  totalSpent: number;
  totalIncome: number;
  transactionCount: number;
  topMerchants: Array<{
    merchantName: string;
    totalSpent: number;
    transactionCount: number;
  }>;
  transactions: Array<{
    transactionId: string;
    accountId: string;
    accountName: string;
    institutionName: string | null;
    postedOn: string;
    amount: number;
    transactionType: string;
    merchantName: string | null;
  }>;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

export async function getMonthlySummary({
  ownerUserId,
  month,
  limit: requestedLimit,
}: FinanceMonthlySummaryInput): Promise<FinanceMonthlySummary> {
  const { startsOn, endsBefore } = monthRange(month);
  const limit = boundedLimit(requestedLimit);
  const records = await FinanceQueryRepository.listMonthlyTransactions(db, ownerUserId, {
    startsOn,
    endsBefore,
  });
  const merchantTotals = new Map<string, { totalSpent: number; transactionCount: number }>();
  let totalSpent = 0;
  let totalIncome = 0;

  for (const record of records) {
    const spent = expenseAmount(record.amount, record.transactionType);
    const income = incomeAmount(record.amount, record.transactionType);
    totalSpent += spent;
    totalIncome += income;

    const merchantName = record.merchantName?.trim();
    if (!merchantName || spent <= 0) continue;
    const current = merchantTotals.get(merchantName) ?? { totalSpent: 0, transactionCount: 0 };
    current.totalSpent += spent;
    current.transactionCount += 1;
    merchantTotals.set(merchantName, current);
  }

  return {
    month,
    startsOn,
    endsBefore,
    currencyCode: records[0]?.currencyCode ?? 'USD',
    totalSpent: roundMoney(totalSpent),
    totalIncome: roundMoney(totalIncome),
    transactionCount: records.length,
    topMerchants: [...merchantTotals.entries()]
      .map(([merchantName, value]) => ({
        merchantName,
        totalSpent: roundMoney(value.totalSpent),
        transactionCount: value.transactionCount,
      }))
      .sort(
        (left, right) =>
          right.totalSpent - left.totalSpent || left.merchantName.localeCompare(right.merchantName),
      )
      .slice(0, limit),
    transactions: records.slice(0, limit),
  };
}

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new ValidationError('limit must be a positive integer.');
  }
  return Math.min(limit, MAX_LIMIT);
}

function monthRange(month: string): { startsOn: string; endsBefore: string } {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new ValidationError('month must use YYYY-MM format.');
  }

  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const starts = new Date(Date.UTC(year, monthIndex, 1));
  if (
    Number.isNaN(starts.valueOf()) ||
    starts.getUTCFullYear() !== year ||
    starts.getUTCMonth() !== monthIndex
  ) {
    throw new ValidationError('month must use YYYY-MM format.');
  }

  const ends = new Date(Date.UTC(year, monthIndex + 1, 1));
  return {
    startsOn: starts.toISOString().slice(0, 10),
    endsBefore: ends.toISOString().slice(0, 10),
  };
}

function expenseAmount(amount: number, transactionType: string): number {
  if (transactionType === 'expense' || transactionType === 'debit') return Math.abs(amount);
  return amount < 0 ? Math.abs(amount) : 0;
}

function incomeAmount(amount: number, transactionType: string): number {
  if (transactionType === 'income' || transactionType === 'credit') return Math.max(amount, 0);
  return amount > 0 ? amount : 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
