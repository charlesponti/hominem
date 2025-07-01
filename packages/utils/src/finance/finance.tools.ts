import { tool } from 'ai'
import { and, eq, like } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index'
import { budgetCategories, type FinanceTransactionInsert } from '../db/schema/finance.schema'
import { calculateTransactions } from './analytics/transaction-analytics.service'
import { createAccount, deleteAccount, listAccounts, updateAccount } from './core/account.service'
import {
  createTransaction,
  deleteTransaction,
  queryTransactions,
  updateTransaction,
} from './finance.transactions.service'
import type { QueryOptions } from './finance.types'

export const budgetCalculatorSchema = z.object({
  monthlyIncome: z.number().positive().describe('Monthly income amount'),
  savingsPercentage: z.number().min(0).max(100).describe('Percentage of income to save'),
  fixedExpenses: z.number().nonnegative().describe('Total fixed monthly expenses'),
})

export const savingsGoalCalculatorSchema = z.object({
  targetAmount: z.number().positive().describe('Target savings amount'),
  currentSavings: z.number().nonnegative().describe('Current savings amount'),
  monthlyContribution: z.number().positive().describe('Monthly contribution amount'),
  interestRate: z.number().min(0).max(100).optional().describe('Annual interest rate (%)'),
})

export const loanCalculatorSchema = z.object({
  loanAmount: z.number().positive().describe('Total loan amount'),
  interestRate: z.number().positive().describe('Annual interest rate (%)'),
  loanTermYears: z.number().positive().describe('Loan term in years'),
})

export const financeAccountSchema = z.object({
  name: z.string().describe('Name of the account'),
  type: z
    .enum(['checking', 'savings', 'investment', 'credit', 'loan', 'retirement'])
    .describe('Type of account'),
  balance: z.string().describe('Initial balance'),
  interestRate: z.string().optional().describe('Interest rate (if applicable)'),
  minimumPayment: z.string().optional().describe('Minimum payment (if applicable)'),
  userId: z.string().describe('User ID who owns this account'),
})

export const getFinanceAccountsSchema = z.object({
  userId: z.string().describe('User ID to filter accounts by'),
  type: z
    .enum(['checking', 'savings', 'investment', 'credit', 'loan', 'retirement'])
    .optional()
    .describe('Filter by account type'),
})

export const updateFinanceAccountSchema = z.object({
  accountId: z.string().describe('ID of the account to update'),
  name: z.string().optional().describe('New name for the account'),
  balance: z.number().optional().describe('New balance'),
  interestRate: z.number().optional().describe('New interest rate'),
  minimumPayment: z.number().optional().describe('New minimum payment'),
  userId: z.string().describe('User ID who owns this account'),
})

export const deleteFinanceAccountSchema = z.object({
  accountId: z.string().describe('ID of the account to delete'),
  userId: z.string().describe('User ID who owns this account'),
})

export const createTransactionSchema = z.object({
  type: z
    .enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment'])
    .describe('Type of transaction'),
  amount: z.number().describe('Transaction amount'),
  date: z.string().describe('Transaction date (YYYY-MM-DD)'),
  description: z.string().optional().describe('Transaction description'),
  accountId: z.string().describe('Account ID this transaction belongs to'),
  fromAccountId: z.string().optional().describe('Source account ID (for transfers)'),
  toAccountId: z.string().optional().describe('Destination account ID (for transfers)'),
  category: z.string().optional().describe('Transaction category'),
  parentCategory: z.string().optional().describe('Parent category'),
  notes: z.string().optional().describe('Additional notes'),
  recurring: z.boolean().optional().describe('Whether this is a recurring transaction'),
  userId: z.string().describe('User ID who owns this transaction'),
})

export const getTransactionsSchema = z.object({
  userId: z.string().describe('User ID to filter transactions by'),
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
})

export const updateTransactionSchema = z.object({
  transactionId: z.string().describe('ID of the transaction to update'),
  amount: z.number().optional().describe('New transaction amount'),
  date: z.string().optional().describe('New transaction date'),
  description: z.string().optional().describe('New description'),
  category: z.string().optional().describe('New category'),
  parentCategory: z.string().optional().describe('New parent category'),
  notes: z.string().optional().describe('New notes'),
  userId: z.string().describe('User ID who owns this transaction'),
})

export const deleteTransactionSchema = z.object({
  transactionId: z.string().describe('ID of the transaction to delete'),
  userId: z.string().describe('User ID who owns this transaction'),
})

export const getBudgetCategoriesSchema = z.object({
  userId: z.string().describe('User ID who owns the categories'),
  categoryName: z.string().optional(),
  categoryId: z.string().optional(),
  categoryType: z.string().optional(),
})

export const calculateTransactionsSchema = z.object({
  calculationType: z
    .enum(['sum', 'average', 'count'])
    .describe('Type of calculation to perform (sum, average, count)'),
  userId: z.string().describe('User ID for filtering transactions'),
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
  type: z
    .enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment'])
    .optional()
    .describe('Filter by transaction type'),
  category: z.string().optional().describe('Filter by category'),
  accountId: z.string().optional().describe('Filter by account ID'),
  descriptionLike: z
    .string()
    .optional()
    .describe('Filter transactions where description contains this text'),
})

export const create_finance_account = tool({
  description: 'Create a new finance account',
  parameters: financeAccountSchema,
  async execute(args) {
    const created = await createAccount({
      name: args.name,
      type: args.type,
      balance: args.balance,
      interestRate: args.interestRate || null,
      minimumPayment: args.minimumPayment || null,
      userId: args.userId,
    })
    return { message: `Created account ${created.id}`, account: created }
  },
})

export const get_finance_accounts = tool({
  description: 'Get all finance accounts',
  parameters: getFinanceAccountsSchema,
  async execute(args) {
    let accounts = await listAccounts(args.userId)
    if (args.type) {
      accounts = accounts.filter((acc) => acc.type === args.type)
    }
    return {
      accounts,
      message: `Retrieved finance accounts${args.type ? ` of type: ${args.type}` : ''}`,
    }
  },
})

export const update_finance_account = tool({
  description: 'Update a finance account',
  parameters: updateFinanceAccountSchema,
  async execute(args) {
    const updates: Partial<{
      name: string
      balance: string
      interestRate: string | null
      minimumPayment: string | null
    }> = {}
    if (args.name) updates.name = args.name
    if (args.balance) updates.balance = args.balance.toString()
    if (args.interestRate) updates.interestRate = args.interestRate.toString()
    if (args.minimumPayment) updates.minimumPayment = args.minimumPayment.toString()

    const updated = await updateAccount(args.accountId, args.userId, updates)
    return { message: `Updated finance account ${updated.id}`, account: updated }
  },
})

export const delete_finance_account = tool({
  description: 'Delete a finance account',
  parameters: deleteFinanceAccountSchema,
  async execute(args) {
    await deleteAccount(args.accountId, args.userId)
    return { message: `Deleted finance account ${args.accountId}` }
  },
})

export const create_transaction = tool({
  description: 'Create a new financial transaction',
  parameters: createTransactionSchema,
  async execute(args) {
    const transaction: FinanceTransactionInsert = {
      id: crypto.randomUUID(),
      type: args.type,
      amount: args.amount.toString(),
      date: new Date(args.date),
      description: args.description,
      accountId: args.accountId,
      fromAccountId: args.fromAccountId || null,
      toAccountId: args.toAccountId || null,
      category: args.category || '',
      parentCategory: args.parentCategory || '',
      note: args.notes,
      recurring: args.recurring || false,
      userId: args.userId,
    }

    const result = await createTransaction(transaction)
    return {
      message: `Created ${args.type} transaction for ${args.amount} on ${args.date}`,
      transaction: result,
    }
  },
})

export const get_transactions = tool({
  description: 'Get financial transactions',
  parameters: getTransactionsSchema,
  async execute(args) {
    const options: QueryOptions = {
      from: args.startDate,
      to: args.endDate,
      category: args.category,
      min: args.minAmount?.toString(),
      max: args.maxAmount?.toString(),
      account: args.accountId,
      userId: args.userId,
    }

    const transactions = await queryTransactions(options)
    return {
      transactions,
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
  parameters: updateTransactionSchema,
  async execute(args) {
    const updates: Partial<FinanceTransactionInsert> = {}
    if (args.amount) updates.amount = args.amount.toString()
    if (args.date) updates.date = new Date(args.date)
    if (args.description) updates.description = args.description
    if (args.category) updates.category = args.category
    if (args.parentCategory) updates.parentCategory = args.parentCategory
    if (args.notes) updates.note = args.notes

    const updated = await updateTransaction(args.transactionId, args.userId, updates)
    return {
      message: `Updated transaction ${updated.id}`,
      transaction: updated,
    }
  },
})

export const delete_transaction = tool({
  description: 'Delete a financial transaction',
  parameters: deleteTransactionSchema,
  async execute(args) {
    await deleteTransaction(args.transactionId, args.userId)
    return {
      message: `Deleted transaction ${args.transactionId}`,
    }
  },
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

export const loanCalculatorTool = tool({
  description: 'Calculate loan payments and total cost',
  parameters: loanCalculatorSchema,
  async execute(details): Promise<object> {
    const { loanAmount, interestRate, loanTermYears } = details
    const monthlyRate = interestRate / 100 / 12
    const payments = loanTermYears * 12
    const monthlyPayment =
      (loanAmount * monthlyRate * (1 + monthlyRate) ** payments) /
      ((1 + monthlyRate) ** payments - 1)
    const totalCost = monthlyPayment * payments

    return {
      monthlyPayment: Number(monthlyPayment.toFixed(2)),
      totalInterestPaid: Number((totalCost - loanAmount).toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      loanTermMonths: payments,
    }
  },
})

export const get_budget_categories = tool({
  description: 'A tool to get budget categories by id, name, or type.',
  parameters: getBudgetCategoriesSchema,
  execute: async (query) => {
    const dbQuery = db
      .select()
      .from(budgetCategories)
      .where(
        and(
          eq(budgetCategories.userId, query.userId),
          query.categoryId ? eq(budgetCategories.id, query.categoryId) : undefined,
          query.categoryName ? like(budgetCategories.name, `%${query.categoryName}%`) : undefined,
          query.categoryType ? eq(budgetCategories.type, query.categoryType) : undefined
        )
      )

    return dbQuery
  },
})

export const calculate_transactions = tool({
  description:
    'Calculate aggregate values (sum, average, count) for transactions based on filters. Useful for questions like "How much did I spend on coffee last month?" or "What was my total income this year?".',
  parameters: calculateTransactionsSchema,
  async execute(args) {
    const {
      calculationType,
      userId,
      startDate,
      endDate,
      type,
      category,
      accountId,
      descriptionLike,
    } = args

    // Convert tool parameters to service function parameters
    const options = {
      userId,
      from: startDate,
      to: endDate,
      type,
      category,
      account: accountId,
      calculationType,
      descriptionLike,
    }

    const result = await calculateTransactions(options)

    // Format the result for the tool response
    let value = 0
    if ('value' in result) {
      value = result.value
    } else {
      // If we got full stats, use the appropriate value based on calculationType
      switch (calculationType) {
        case 'sum':
          value = Number.parseFloat(result.total)
          break
        case 'average':
          value = Number.parseFloat(result.average)
          break
        case 'count':
          value = result.count
          break
        default:
          // Return full stats object for 'stats' type
          return {
            calculationResult: result,
            message: `Calculated statistics for filters: ${
              Object.entries(args)
                .filter(
                  ([key, val]) => key !== 'userId' && key !== 'calculationType' && val !== undefined
                )
                .map(([key, val]) => `${key}=${val}`)
                .join(', ') || 'none'
            }`,
          }
      }
    }

    // Construct a descriptive message
    let message = `Calculated ${calculationType}: ${value}`
    const filtersApplied = Object.entries(args)
      .filter(([key, val]) => key !== 'userId' && key !== 'calculationType' && val !== undefined)
      .map(([key, val]) => `${key}=${val}`)
      .join(', ')

    if (filtersApplied) {
      message += ` for filters: ${filtersApplied}`
    }

    return {
      calculationResult: value,
      message,
    }
  },
})

export const tools = {
  // Accounts
  create_finance_account,
  get_finance_accounts,
  update_finance_account,
  delete_finance_account,

  // Transactions
  create_transaction,
  get_transactions,
  update_transaction,
  delete_transaction,
  calculate_transactions,

  // Budgeting
  get_budget_categories,

  budgetCalculatorTool,
  savingsGoalCalculatorTool,
  loanCalculatorTool,
}
