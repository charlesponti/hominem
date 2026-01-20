import {
  FinanceAccountSchema,
  FinanceAccountInsertSchema,
  TransactionSchema,
  TransactionInsertSchema,
  AccountTypeEnum,
  TransactionTypeEnum,
} from '@hominem/db';
import { z } from 'zod';

// Generic success response schema
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// Account schemas
export const createFinanceAccountInputSchema = FinanceAccountInsertSchema.pick({
  name: true,
  type: true,
}).extend({
  balance: z.number().optional().describe('Initial account balance'),
  currency: z.string().optional().describe('Currency code'),
});

export const createFinanceAccountOutputSchema = FinanceAccountSchema;

export const getFinanceAccountsInputSchema = z.object({
  type: AccountTypeEnum.optional(),
});

export const getFinanceAccountsOutputSchema = z.object({
  accounts: z.array(FinanceAccountSchema),
  total: z.number(),
});

export const updateFinanceAccountInputSchema = z
  .object({
    accountId: z.string().describe('ID of the account to update'),
  })
  .extend(
    FinanceAccountInsertSchema.pick({
      name: true,
      balance: true,
      interestRate: true,
      minimumPayment: true,
    }).partial().shape,
  );

export const updateFinanceAccountOutputSchema = FinanceAccountSchema.pick({
  id: true,
  name: true,
  type: true,
  balance: true,
  updatedAt: true,
});

export const deleteFinanceAccountInputSchema = z.object({
  accountId: z.string().describe('ID of the account to delete'),
});

export const deleteFinanceAccountOutputSchema = SuccessResponseSchema;

// Transaction schemas
export const createTransactionInputSchema = TransactionInsertSchema.pick({
  accountId: true,
  amount: true,
  description: true,
  type: true,
  category: true,
}).extend({
  date: z.string().optional().describe('Transaction date (ISO format)'),
});

export const createTransactionToolOutputSchema = TransactionSchema;

export const getTransactionsInputSchema = z.object({
  accountId: z.string().describe('The account ID'),
  from: z.string().optional().describe('Start date (ISO format)'),
  to: z.string().optional().describe('End date (ISO format)'),
  category: z.string().optional().describe('Filter by category'),
  limit: z.number().optional().describe('Max results to return'),
});

export const getTransactionsOutputSchema = z.object({
  transactions: z.array(TransactionSchema),
  total: z.number(),
});

export const updateTransactionInputSchema = z
  .object({
    transactionId: z.string().describe('The transaction ID'),
  })
  .extend(
    TransactionInsertSchema.pick({
      amount: true,
      description: true,
      category: true,
    }).partial().shape,
  );

export const updateTransactionOutputSchema = TransactionSchema;

export const deleteTransactionInputSchema = z.object({
  transactionId: z.string().describe('The transaction ID'),
});

export const deleteTransactionOutputSchema = SuccessResponseSchema;

// Analytics & Reporting schemas
export const CategoryBreakdownSchema = z.object({
  category: z.string(),
  amount: z.number(),
  percentage: z.number(),
  transactionCount: z.number(),
});

export const getCategoryBreakdownInputSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
});

export const getCategoryBreakdownOutputSchema = z.object({
  breakdown: z.array(CategoryBreakdownSchema),
  totalSpending: z.number(),
  averagePerDay: z.number(),
});

export const getSpendingTimeSeriesInputSchema = z.object({
  from: z.string().optional().describe('Start date'),
  to: z.string().optional().describe('End date'),
});

export const getSpendingTimeSeriesOutputSchema = z.object({
  series: z.array(
    z.object({
      month: z.string(),
      count: z.number(),
      income: z.string(),
      expenses: z.string(),
      average: z.string(),
    }),
  ),
  total: z.number(),
  average: z.number(),
});

export const getTopMerchantsInputSchema = z.object({
  limit: z.number().optional().describe('Number of top merchants to return'),
});

export const getTopMerchantsOutputSchema = z.object({
  merchants: z.array(
    z.object({
      name: z.string(),
      totalSpent: z.number(),
      transactionCount: z.number(),
    }),
  ),
});

// Financial Calculators schemas
export const calculateBudgetBreakdownInputSchema = z.object({
  monthlyIncome: z.number().describe('Monthly income'),
  savingsTarget: z.number().optional().describe('Monthly savings goal'),
});

export const calculateBudgetBreakdownOutputSchema = z.object({
  housing: z.number(),
  food: z.number(),
  transportation: z.number(),
  utilities: z.number(),
  healthcare: z.number(),
  entertainment: z.number(),
  savings: z.number(),
});

export const calculateRunwayInputSchema = z.object({
  currentBalance: z.number().describe('Current available balance'),
  monthlyExpenses: z.number().describe('Average monthly expenses'),
});

export const calculateRunwayOutputSchema = z.object({
  months: z.number(),
  days: z.number(),
  estimatedEndDate: z.string(),
});

export const calculateSavingsGoalInputSchema = z.object({
  currentSavings: z.number().describe('Current savings amount'),
  goalAmount: z.number().describe('Target savings amount'),
  monthlyContribution: z.number().describe('Monthly savings contribution'),
  interestRate: z.number().optional().describe('Annual interest rate (%)'),
});

export const calculateSavingsGoalOutputSchema = z.object({
  monthsToGoal: z.number(),
  completionDate: z.string(),
  totalInterestEarned: z.number(),
});

export const calculateLoanDetailsInputSchema = z.object({
  principal: z.number().describe('Loan amount'),
  annualRate: z.number().describe('Annual interest rate (%)'),
  months: z.number().describe('Loan term in months'),
});

export const calculateLoanDetailsOutputSchema = z.object({
  monthlyPayment: z.number(),
  totalPayment: z.number(),
  totalInterest: z.number(),
});
