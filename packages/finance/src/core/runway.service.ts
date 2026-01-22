import { z } from 'zod';

export const runwayCalculationSchema = z.object({
  balance: z.number().positive(),
  monthlyExpenses: z.number().positive(),
  plannedPurchases: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number().positive(),
        date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
          message: 'Invalid date format',
        }),
      }),
    )
    .optional(),
});

type RunwayCalculationInput = z.infer<typeof runwayCalculationSchema>;

export interface RunwayCalculationResult {
  runwayMonths: number;
  burnRate: number;
  initialBalance: number;
  currentBalance: number;
  runwayEndDate: string;
  monthlyBreakdown: Array<{
    month: string;
    expenses: number;
    purchases: number;
    endingBalance: number;
  }>;
  isRunwayDangerous: boolean;
  minimumBalance: number;
  totalPlannedExpenses: number;
}

/**
 * Calculate financial runway based on current balance, monthly expenses, and planned purchases
 */
export function calculateDetailedRunway(input: RunwayCalculationInput): RunwayCalculationResult {
  const { balance, monthlyExpenses, plannedPurchases = [] } = input;

  // Group planned purchases by month
  const purchasesByMonth: Record<string, number> = {};

  for (const purchase of plannedPurchases) {
    const purchaseDate = new Date(purchase.date);
    const monthKey = `${purchaseDate.getFullYear()}-${purchaseDate.getMonth() + 1}`;
    purchasesByMonth[monthKey] = (purchasesByMonth[monthKey] || 0) + purchase.amount;
  }

  // Calculate months of runway with monthly breakdown
  const today = new Date();
  const monthlyBreakdown = [];
  const currentDate = new Date(today);
  let runwayMonths = 0;
  let runningBalance = balance;
  const balances: number[] = [balance];

  while (runningBalance > 0) {
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    const monthExpenses = monthlyExpenses + (purchasesByMonth[monthKey] || 0);

    runningBalance -= monthExpenses;
    balances.push(runningBalance);

    if (runningBalance > 0) {
      runwayMonths++;
      monthlyBreakdown.push({
        month: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        expenses: monthExpenses,
        purchases: purchasesByMonth[monthKey] || 0,
        endingBalance: runningBalance,
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Safety limit to prevent infinite loops
    if (runwayMonths > 120) {
      break;
    }
  }

  // Calculate additional metrics
  const totalPlannedExpenses = plannedPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const runwayEndDate = new Date(today);
  runwayEndDate.setMonth(today.getMonth() + runwayMonths);

  const minimumBalance = Math.min(...balances);
  const isRunwayDangerous = runwayMonths <= 6;

  return {
    runwayMonths,
    burnRate: monthlyExpenses,
    initialBalance: balance,
    currentBalance: runningBalance > 0 ? runningBalance : 0,
    runwayEndDate: runwayEndDate.toISOString(),
    monthlyBreakdown,
    isRunwayDangerous,
    minimumBalance,
    totalPlannedExpenses,
  };
}

/**
 * Calculate runway with 12-month projection for chart data
 */
export function calculateRunwayProjection(input: RunwayCalculationInput) {
  const { balance, monthlyExpenses, plannedPurchases = [] } = input;

  const today = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(today);
    date.setMonth(today.getMonth() + i);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      date: new Date(date),
    };
  });

  let runningBalance = balance;
  const chartData = months.map(({ month, date }) => {
    runningBalance -= monthlyExpenses;

    // Apply planned purchases for this month
    for (const purchase of plannedPurchases) {
      const purchaseDate = new Date(purchase.date);
      if (
        purchaseDate.getMonth() === date.getMonth() &&
        purchaseDate.getFullYear() === date.getFullYear()
      ) {
        runningBalance -= purchase.amount;
      }
    }

    return {
      month,
      balance: Math.round(runningBalance),
    };
  });

  return chartData;
}
