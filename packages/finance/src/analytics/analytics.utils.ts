/**
 * Calculate average spending per day
 * @param totalSpending Total spending amount
 * @param from Start date (ISO format)
 * @param to End date (ISO format)
 * @returns Average spending per day
 */
export function calculateAveragePerDay(
  totalSpending: number,
  from: string | undefined,
  to: string | undefined,
): number {
  if (!totalSpending) return 0;

  let numberOfDays = 30;

  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }

  return totalSpending / numberOfDays;
}

/**
 * Calculate totals and average from time series data
 * @param series Array of time series data with income and expenses
 * @returns Total and average per period
 */
export function calculateTimeSeriesTotals(series: Array<{ income: string; expenses: string }>): {
  total: number;
  average: number;
} {
  if (!series || series.length === 0) {
    return { total: 0, average: 0 };
  }

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const period of series) {
    totalIncome += Number.parseFloat(period.income || '0');
    totalExpenses += Number.parseFloat(period.expenses || '0');
  }

  const total = totalIncome + totalExpenses;
  const average = series.length > 0 ? total / series.length : 0;

  return { total, average };
}
