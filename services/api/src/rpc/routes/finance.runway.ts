import {
  calculateBudgetBreakdown,
  calculateBudgetBreakdownInputSchema,
  calculateLoanDetails,
  calculateRunway,
  calculateSavingsGoal,
  calculateSavingsGoalInputSchema,
  runwayCalculationSchema,
} from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth';
import type { AppContext } from '../middleware/auth';

const numberFromQuery = z.coerce.number();

const plannedPurchaseSchema = z.object({
  description: z.string(),
  amount: numberFromQuery,
  date: z.string(),
});

const runwayInputSchema = z.object({
  balance: numberFromQuery,
  monthlyExpenses: numberFromQuery,
  plannedPurchases: z.array(plannedPurchaseSchema).optional(),
  projectionMonths: z.coerce.number().optional().default(24),
});

const budgetBreakdownInputSchema = z.object({
  monthlyIncome: numberFromQuery,
  savingsTarget: numberFromQuery.optional(),
});

const savingsGoalInputSchema = z.object({
  currentSavings: numberFromQuery,
  goalAmount: numberFromQuery,
  monthlyContribution: numberFromQuery,
  interestRate: numberFromQuery.optional(),
});

const loanDetailsInputSchema = z.object({
  principal: numberFromQuery,
  annualRate: numberFromQuery,
  months: z.coerce.number().int().positive(),
});

export const runwayRoutes = new Hono<AppContext>()
  .get('/calculate', authMiddleware, zValidator('query', runwayInputSchema), async (c) => {
    const input = c.req.valid('query');
    const parsed = runwayCalculationSchema.parse({
      monthlyIncome: 0,
      monthlyExpenses: input.monthlyExpenses,
      cashReserve: input.balance,
    });
    const result = calculateRunway(parsed);
    const projectionMonths = Math.max(1, Math.min(120, input.projectionMonths ?? 24));
    const monthlyPurchases = new Map<number, number>();
    for (const purchase of input.plannedPurchases ?? []) {
      const purchaseDate = new Date(`${purchase.date}T00:00:00Z`);
      if (!Number.isNaN(purchaseDate.getTime())) {
        const index = Math.max(
          0,
          Math.floor((purchaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)),
        );
        monthlyPurchases.set(index, (monthlyPurchases.get(index) ?? 0) + purchase.amount);
      }
    }
    const projectionData: Array<{ month: string; balance: number }> = [];
    let runningBalance = input.balance;
    for (let month = 0; month < projectionMonths; month++) {
      runningBalance -= input.monthlyExpenses;
      runningBalance -= monthlyPurchases.get(month) ?? 0;
      const projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + month + 1);
      projectionData.push({
        month: projectedDate.toISOString().slice(0, 7),
        balance: runningBalance,
      });
    }

    const totalPlannedExpenses = [...monthlyPurchases.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    const runwayEndDate = new Date();
    if (result.months !== Number.POSITIVE_INFINITY) {
      runwayEndDate.setMonth(runwayEndDate.getMonth() + result.months);
    }

    return c.json({
      runwayMonths: result.months,
      runwayEndDate: runwayEndDate.toISOString(),
      isRunwayDangerous: result.months !== Number.POSITIVE_INFINITY && result.months <= 6,
      totalPlannedExpenses,
      projectionData,
      months: result.months,
      years:
        result.months === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : result.months / 12,
    });
  })
  .get(
    '/budget-breakdown',
    authMiddleware,
    zValidator('query', budgetBreakdownInputSchema),
    async (c) => {
      const input = c.req.valid('query');
      const parsed = calculateBudgetBreakdownInputSchema.parse(input);
      return c.json(calculateBudgetBreakdown(parsed));
    },
  )
  .get('/savings-goal', authMiddleware, zValidator('query', savingsGoalInputSchema), async (c) => {
    const input = c.req.valid('query');
    const parsed = calculateSavingsGoalInputSchema.parse(input);
    return c.json(calculateSavingsGoal(parsed));
  })
  .get('/loan-details', authMiddleware, zValidator('query', loanDetailsInputSchema), async (c) => {
    const input = c.req.valid('query');
    const result = calculateLoanDetails({
      principal: input.principal,
      annualRate: input.annualRate,
      months: input.months,
    });
    return c.json(result);
  });
