import { db } from '@ponti/utils/db'
import { budgetCategories } from '@ponti/utils/schema'
import { tool } from 'ai'
import { and, eq, like } from 'drizzle-orm'
import { z } from 'zod'

export const create_finance_account = tool({
  description: 'Create a new finance account',
  parameters: z.object({
    name: z.string().describe('Name of the account'),
    type: z
      .enum(['checking', 'savings', 'investment', 'credit', 'loan', 'retirement'])
      .describe('Type of account'),
    balance: z.number().describe('Initial balance'),
    interestRate: z.number().optional().describe('Interest rate (if applicable)'),
    minimumPayment: z.number().optional().describe('Minimum payment (if applicable)'),
  }),
  async execute(args) {
    return {
      message: `Created ${args.type} account: ${args.name} with balance ${args.balance}`,
    }
  },
})

export const get_finance_accounts = tool({
  description: 'Get all finance accounts',
  parameters: z.object({
    type: z
      .enum(['checking', 'savings', 'investment', 'credit', 'loan', 'retirement'])
      .optional()
      .describe('Filter by account type'),
  }),
  async execute(args) {
    return {
      message: `Retrieved finance accounts${args.type ? ` of type: ${args.type}` : ''}`,
    }
  },
})

export const update_finance_account = tool({
  description: 'Update a finance account',
  parameters: z.object({
    accountId: z.string().describe('ID of the account to update'),
    name: z.string().optional().describe('New name for the account'),
    balance: z.number().optional().describe('New balance'),
    interestRate: z.number().optional().describe('New interest rate'),
    minimumPayment: z.number().optional().describe('New minimum payment'),
  }),
  async execute(args) {
    return {
      message: `Updated finance account ${args.accountId}`,
    }
  },
})

export const delete_finance_account = tool({
  description: 'Delete a finance account',
  parameters: z.object({
    accountId: z.string().describe('ID of the account to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted finance account ${args.accountId}`,
    }
  },
})

export const create_transaction = tool({
  description: 'Create a new financial transaction',
  parameters: z.object({
    type: z
      .enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment'])
      .describe('Type of transaction'),
    amount: z.number().describe('Transaction amount'),
    date: z.string().describe('Transaction date (YYYY-MM-DD)'),
    description: z.string().optional().describe('Transaction description'),
    fromAccountId: z.string().optional().describe('Source account ID (for transfers)'),
    toAccountId: z.string().optional().describe('Destination account ID (for transfers)'),
    category: z.string().optional().describe('Transaction category'),
    parentCategory: z.string().optional().describe('Parent category'),
    notes: z.string().optional().describe('Additional notes'),
    recurring: z.boolean().optional().describe('Whether this is a recurring transaction'),
  }),
  async execute(args) {
    return {
      message: `Created ${args.type} transaction for ${args.amount} on ${args.date}`,
    }
  },
})

export const get_transactions = tool({
  description: 'Get financial transactions',
  parameters: z.object({
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    type: z
      .enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment'])
      .optional()
      .describe('Filter by transaction type'),
    category: z.string().optional().describe('Filter by category'),
    accountId: z.string().optional().describe('Filter by account ID'),
    minAmount: z.number().optional().describe('Minimum transaction amount'),
    maxAmount: z.number().optional().describe('Maximum transaction amount'),
  }),
  async execute(args) {
    return {
      message: `Retrieved transactions${args.startDate ? ` from ${args.startDate}` : ''}${
        args.endDate ? ` to ${args.endDate}` : ''
      }${args.type ? ` of type: ${args.type}` : ''}${
        args.category ? ` in category: ${args.category}` : ''
      }`,
    }
  },
})

export const update_transaction = tool({
  description: 'Update a financial transaction',
  parameters: z.object({
    transactionId: z.string().describe('ID of the transaction to update'),
    amount: z.number().optional().describe('New transaction amount'),
    date: z.string().optional().describe('New transaction date'),
    description: z.string().optional().describe('New description'),
    category: z.string().optional().describe('New category'),
    parentCategory: z.string().optional().describe('New parent category'),
    notes: z.string().optional().describe('New notes'),
  }),
  async execute(args) {
    return {
      message: `Updated transaction ${args.transactionId}`,
    }
  },
})

export const delete_transaction = tool({
  description: 'Delete a financial transaction',
  parameters: z.object({
    transactionId: z.string().describe('ID of the transaction to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted transaction ${args.transactionId}`,
    }
  },
})

export const budgetCalculatorSchema = z.object({
  monthlyIncome: z.number(),
  savingsPercentage: z.number(),
  fixedExpenses: z.number(),
})

export const budgetCalculatorTool = tool({
  description: 'Calculate monthly budget breakdown',
  parameters: budgetCalculatorSchema,
  async execute(details): Promise<object> {
    const { monthlyIncome, savingsPercentage, fixedExpenses } = details
    const savingsAmount = monthlyIncome * (savingsPercentage / 100)
    const discretionarySpending = monthlyIncome - savingsAmount - fixedExpenses

    return {
      totalIncome: monthlyIncome,
      savings: savingsAmount,
      fixedExpenses,
      discretionarySpending,
    }
  },
})

const savingsGoalCalculatorSchema = z.object({
  targetAmount: z.number(),
  currentSavings: z.number(),
  monthlyContribution: z.number(),
  interestRate: z.number().optional(),
})

export const savingsGoalCalculatorTool = tool({
  description: 'Calculate time needed to reach a savings goal',
  parameters: savingsGoalCalculatorSchema,
  async execute(details): Promise<object> {
    const { targetAmount, currentSavings, monthlyContribution, interestRate = 0 } = details
    const remaining = targetAmount - currentSavings
    const monthsToGoal =
      interestRate > 0
        ? Math.log(1 + (remaining * interestRate) / 1200 / monthlyContribution) /
          Math.log(1 + interestRate / 1200)
        : remaining / monthlyContribution

    return {
      monthsToGoal: Math.ceil(monthsToGoal),
      yearsToGoal: Math.ceil((monthsToGoal / 12) * 10) / 10,
    }
  },
})

const loanCalculatorSchema = z.object({
  loanAmount: z.number(),
  interestRate: z.number(),
  loanTermYears: z.number(),
  startDate: z.string(),
  endDate: z.string(),
})

export const loanCalculatorTool = tool({
  description: 'Calculate loan payments and total cost',
  parameters: loanCalculatorSchema,
  async execute(details): Promise<object> {
    const { loanAmount, interestRate, loanTermYears, startDate, endDate } = details
    const monthlyRate = interestRate / 100 / 12
    const payments = loanTermYears * 12
    const monthlyPayment =
      (loanAmount * monthlyRate * (1 + monthlyRate) ** payments) / (1 + monthlyRate ** payments - 1)
    const totalCost = monthlyPayment * payments

    return {
      monthlyPayment,
      totalInterestPaid: totalCost - loanAmount,
      totalCost,
      loanTermMonths: payments,
    }
  },
})

const budgetCategorySchema = z.object({
  category_query: z.string().describe('The budget category to search for'),
})

export const get_budget_category_suggestions = tool({
  description: 'Search for budget categories',
  parameters: budgetCategorySchema,
  async execute() {
    return [
      { name: 'Housing', averageMonthlyExpense: 1200 },
      { name: 'Food', averageMonthlyExpense: 500 },
      { name: 'Transportation', averageMonthlyExpense: 300 },
      { name: 'Entertainment', averageMonthlyExpense: 200 },
      { name: 'Utilities', averageMonthlyExpense: 250 },
    ]
  },
})

export const get_budget_categories = tool({
  description: 'A tool to get budget categories by id, name, or type.',
  parameters: z.object({
    query: z.object({
      categoryName: z.string().optional(),
      categoryId: z.string().optional(),
      categoryType: z.string().optional(),
    }),
  }),
  execute: async ({ query }) => {
    const dbQuery = await db
      .select()
      .from(budgetCategories)
      .where(
        and(
          query.categoryId ? eq(budgetCategories.id, query.categoryId) : undefined,
          query.categoryName ? like(budgetCategories.name, `%${query.categoryName}%`) : undefined,
          query.categoryType ? eq(budgetCategories.type, query.categoryType) : undefined
        )
      )

    return dbQuery
  },
})

export const tools = {
  create_finance_account,
  get_finance_accounts,
  update_finance_account,
  delete_finance_account,
  create_transaction,
  get_transactions,
  update_transaction,
  delete_transaction,
  budgetCalculatorTool,
  savingsGoalCalculatorTool,
  loanCalculatorTool,
  get_budget_category_suggestions,
  get_budget_categories,
}
