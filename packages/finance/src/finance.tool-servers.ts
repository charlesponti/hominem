import crypto from 'node:crypto';
import { z } from 'zod';

import type { QueryOptions, FinanceAccountInsert } from './finance.types';

import { calculateAveragePerDay, calculateTimeSeriesTotals } from './analytics/analytics.utils';
import {
  summarizeByCategory,
  summarizeByMonth,
  findTopMerchants,
} from './analytics/transaction-analytics.service';
import { createAccount, listAccounts, deleteAccount } from './core/account.service';
import {
  createFinanceAccountInputSchema,
  getFinanceAccountsInputSchema,
  deleteFinanceAccountInputSchema,
  deleteFinanceAccountOutputSchema,
  createTransactionInputSchema,
  createTransactionToolOutputSchema,
  getTransactionsInputSchema,
  getTransactionsOutputSchema,
  getCategoryBreakdownInputSchema,
  getSpendingTimeSeriesInputSchema,
  getSpendingTimeSeriesOutputSchema,
  getTopMerchantsInputSchema,
  getTopMerchantsOutputSchema,
  calculateBudgetBreakdownInputSchema,
  calculateRunwayInputSchema,
  calculateSavingsGoalInputSchema,
  calculateLoanDetailsInputSchema,
} from './finance.schemas';
import { createTransaction, queryTransactions } from './finance.transactions.service';

// Accounts
export const getFinanceAccountsServer =
  (userId: string) =>
  async (
    input: z.infer<typeof getFinanceAccountsInputSchema>,
  ): Promise<{ accounts: Awaited<ReturnType<typeof listAccounts>>; total: number }> => {
    const accounts = await listAccounts(userId);
    const filtered = input.type ? accounts.filter((a) => a.type === input.type) : accounts;
    return { accounts: filtered, total: filtered.length };
  };

export const createFinanceAccountServer =
  (userId: string) =>
  async (
    input: z.infer<typeof createFinanceAccountInputSchema>,
  ): Promise<Awaited<ReturnType<typeof createAccount>>> => {
    const payload: Omit<FinanceAccountInsert, 'id'> = {
      name: input.name,
      type: input.type,
      balance: input.balance !== undefined ? input.balance.toString() : '0',
      isoCurrencyCode: input.currency ?? 'USD',
      userId,
    };
    return createAccount(payload);
  };

export const deleteFinanceAccountServer =
  (userId: string) =>
  async (
    input: z.infer<typeof deleteFinanceAccountInputSchema>,
  ): Promise<z.infer<typeof deleteFinanceAccountOutputSchema>> => {
    await deleteAccount(input.accountId, userId);
    return { success: true, message: 'Account deleted successfully' };
  };

// Transactions
export const createTransactionServer =
  (userId: string) =>
  async (
    input: z.infer<typeof createTransactionInputSchema>,
  ): Promise<z.infer<typeof createTransactionToolOutputSchema>> => {
    const result = await createTransaction({
      id: crypto.randomUUID(),
      type: input.type,
      amount: input.amount.toString(),
      date: input.date ? new Date(input.date) : new Date(),
      description: input.description ?? '',
      accountId: input.accountId,
      category: input.category ?? '',
      userId,
    });
    // Service returns FinanceTransaction (with Date fields), convert to tool output schema
    if (!Array.isArray(result)) {
      return {
        ...result,
        date: result.date.toISOString(),
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      };
    }
    throw new Error('Unexpected array result from createTransaction');
  };

export const getTransactionsServer =
  (userId: string) =>
  async (
    input: z.infer<typeof getTransactionsInputSchema>,
  ): Promise<z.infer<typeof getTransactionsOutputSchema>> => {
    const options: QueryOptions = { userId, ...input };
    const { data, filteredCount } = await queryTransactions(options);
    return {
      transactions: data,
      total: filteredCount,
    };
  };

export const getCategoryBreakdownServer =
  (userId: string) => async (input: z.infer<typeof getCategoryBreakdownInputSchema>) => {
    const options: QueryOptions = { userId };
    if (input.from) options.from = input.from;
    if (input.to) options.to = input.to;
    if (input.category) options.category = input.category;
    const breakdown = await summarizeByCategory(options);
    const totalSpending = breakdown.reduce((sum, cat) => sum + Number.parseFloat(cat.total), 0);
    const mappedBreakdown = breakdown.map((cat) => ({
      category: cat.category,
      amount: Number.parseFloat(cat.total),
      percentage: totalSpending > 0 ? (Number.parseFloat(cat.total) / totalSpending) * 100 : 0,
      transactionCount: cat.count,
    }));
    const averagePerDay = calculateAveragePerDay(totalSpending, input.from, input.to);
    return { breakdown: mappedBreakdown, totalSpending, averagePerDay };
  };

export const getSpendingTimeSeriesServer =
  (userId: string) =>
  async (
    input: z.infer<typeof getSpendingTimeSeriesInputSchema>,
  ): Promise<z.infer<typeof getSpendingTimeSeriesOutputSchema>> => {
    const options: QueryOptions = {
      userId,
      from: input.from,
      to: input.to,
    };
    const result = await summarizeByMonth(options);
    const { total, average } = calculateTimeSeriesTotals(result);
    return {
      series: result,
      total,
      average,
    };
  };

export const getTopMerchantsServer =
  (userId: string) =>
  async (
    input: z.infer<typeof getTopMerchantsInputSchema>,
  ): Promise<z.infer<typeof getTopMerchantsOutputSchema>> => {
    const options: QueryOptions = { userId, limit: input.limit || 5 };
    const result = await findTopMerchants(options);
    return {
      merchants: result.map((merchant) => ({
        name: merchant.merchant,
        totalSpent: Number.parseFloat(merchant.totalSpent),
        transactionCount: merchant.frequency,
      })),
    };
  };

// Calculators
export const calculateBudgetBreakdownServer =
  (_userId: string) => async (input: z.infer<typeof calculateBudgetBreakdownInputSchema>) => {
    const { monthlyIncome, savingsTarget = 0 } = input;
    const savings = savingsTarget;
    const housing = monthlyIncome * 0.3;
    const food = monthlyIncome * 0.12;
    const transportation = monthlyIncome * 0.1;
    const utilities = monthlyIncome * 0.06;
    const healthcare = monthlyIncome * 0.05;
    const entertainment = monthlyIncome * 0.05;

    return {
      housing,
      food,
      transportation,
      utilities,
      healthcare,
      entertainment,
      savings,
    };
  };

export const calculateRunwayServer =
  (_userId: string) => async (input: z.infer<typeof calculateRunwayInputSchema>) => {
    const months = Math.floor(input.currentBalance / input.monthlyExpenses);
    const days = months * 30;
    const estimatedEndDate = new Date();
    estimatedEndDate.setMonth(estimatedEndDate.getMonth() + months);
    return { months, days, estimatedEndDate: estimatedEndDate.toISOString() };
  };

export const calculateSavingsGoalServer =
  (_userId: string) => async (input: z.infer<typeof calculateSavingsGoalInputSchema>) => {
    const monthsToGoal = Math.ceil(
      (input.goalAmount - input.currentSavings) / input.monthlyContribution,
    );
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsToGoal);
    return { monthsToGoal, completionDate: completionDate.toISOString(), totalInterestEarned: 0 };
  };

export const calculateLoanDetailsServer =
  (_userId: string) => async (input: z.infer<typeof calculateLoanDetailsInputSchema>) => {
    const monthlyRate = input.annualRate / 100 / 12;
    const denominator = 1 - Math.pow(1 + monthlyRate, -input.months);
    const monthlyPayment = (input.principal * monthlyRate) / denominator;
    const totalPayment = monthlyPayment * input.months;
    const totalInterest = totalPayment - input.principal;
    return { monthlyPayment, totalPayment, totalInterest };
  };
