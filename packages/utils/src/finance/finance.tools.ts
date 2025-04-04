import { db } from '@ponti/utils/db'
import {
  budgetCategories,
  financeAccounts,
  transactions,
  type FinanceAccountInsert,
  type TransactionInsert,
} from '@ponti/utils/schema'
import { tool } from 'ai'
import { and, eq, like, sql } from 'drizzle-orm'
import { z } from 'zod'
import { createNewTransaction, queryTransactions, type QueryOptions } from './finance.service'

const budgetCalculatorSchema = z.object({
  monthlyIncome: z.number().positive().describe('Monthly income amount'),
  savingsPercentage: z.number().min(0).max(100).describe('Percentage of income to save'),
  fixedExpenses: z.number().nonnegative().describe('Total fixed monthly expenses'),
})

const savingsGoalCalculatorSchema = z.object({
  targetAmount: z.number().positive().describe('Target savings amount'),
  currentSavings: z.number().nonnegative().describe('Current savings amount'),
  monthlyContribution: z.number().positive().describe('Monthly contribution amount'),
  interestRate: z.number().min(0).max(100).optional().describe('Annual interest rate (%)'),
})

const loanCalculatorSchema = z.object({
  loanAmount: z.number().positive().describe('Total loan amount'),
  interestRate: z.number().positive().describe('Annual interest rate (%)'),
  loanTermYears: z.number().positive().describe('Loan term in years'),
})

export const create_finance_account = tool({
  description: 'Create a new finance account',
  parameters: z.object({
    name: z.string().describe('Name of the account'),
    type: z
      .enum(['checking', 'savings', 'investment', 'credit', 'loan', 'retirement'])
      .describe('Type of account'),
    balance: z.string().describe('Initial balance'),
    interestRate: z.string().optional().describe('Interest rate (if applicable)'),
    minimumPayment: z.string().optional().describe('Minimum payment (if applicable)'),
    userId: z.string().describe('User ID who owns this account'),
  }),
  async execute(args) {
    const account: FinanceAccountInsert = {
      id: crypto.randomUUID(),
      name: args.name,
      type: args.type,
      balance: args.balance,
      interestRate: args.interestRate ? args.interestRate : null,
      minimumPayment: args.minimumPayment ? args.minimumPayment : null,
      userId: args.userId,
    }
    return db.insert(financeAccounts).values(account).returning()
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
    const query = db.select().from(financeAccounts)
    if (args.type) {
      query.where(eq(financeAccounts.type, args.type))
    }
    const accounts = await query
    return {
      accounts,
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
    const updates: Partial<FinanceAccountInsert> = {}
    if (args.name) updates.name = args.name
    if (args.balance) updates.balance = args.balance.toString()
    if (args.interestRate) updates.interestRate = args.interestRate.toString()
    if (args.minimumPayment) updates.minimumPayment = args.minimumPayment.toString()

    const result = await db
      .update(financeAccounts)
      .set(updates)
      .where(eq(financeAccounts.id, args.accountId))
      .returning()

    return {
      message: `Updated finance account ${args.accountId}`,
      account: result[0],
    }
  },
})

export const delete_finance_account = tool({
  description: 'Delete a finance account',
  parameters: z.object({
    accountId: z.string().describe('ID of the account to delete'),
  }),
  async execute(args) {
    await db.delete(financeAccounts).where(eq(financeAccounts.id, args.accountId))
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
    accountId: z.string().describe('Account ID this transaction belongs to'),
    fromAccountId: z.string().optional().describe('Source account ID (for transfers)'),
    toAccountId: z.string().optional().describe('Destination account ID (for transfers)'),
    category: z.string().optional().describe('Transaction category'),
    parentCategory: z.string().optional().describe('Parent category'),
    notes: z.string().optional().describe('Additional notes'),
    recurring: z.boolean().optional().describe('Whether this is a recurring transaction'),
    userId: z.string().describe('User ID who owns this transaction'),
  }),
  async execute(args) {
    const transaction: TransactionInsert = {
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

    const result = await createNewTransaction(transaction)
    return {
      message: `Created ${args.type} transaction for ${args.amount} on ${args.date}`,
      transaction: result,
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
    const options: QueryOptions = {
      from: args.startDate,
      to: args.endDate,
      category: args.category,
      min: args.minAmount?.toString(),
      max: args.maxAmount?.toString(),
      account: args.accountId,
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
    const updates: Partial<TransactionInsert> = {}
    if (args.amount) updates.amount = args.amount.toString()
    if (args.date) updates.date = new Date(args.date)
    if (args.description) updates.description = args.description
    if (args.category) updates.category = args.category
    if (args.parentCategory) updates.parentCategory = args.parentCategory
    if (args.notes) updates.note = args.notes

    const result = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, args.transactionId))
      .returning()

    return {
      message: `Updated transaction ${args.transactionId}`,
      transaction: result[0],
    }
  },
})

export const delete_transaction = tool({
  description: 'Delete a financial transaction',
  parameters: z.object({
    transactionId: z.string().describe('ID of the transaction to delete'),
  }),
  async execute(args) {
    await db.delete(transactions).where(eq(transactions.id, args.transactionId))
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

export const get_budget_category_suggestions = tool({
  description: 'Get suggested budget categories based on transaction description',
  parameters: z.object({
    description: z.string().describe('Transaction description to get category suggestions for'),
    limit: z.number().optional().default(5).describe('Maximum number of suggestions to return'),
  }),
  async execute(args) {
    // Query similar transactions to get category suggestions
    const similarTransactions = await db
      .select({
        category: transactions.category,
        parentCategory: transactions.parentCategory,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(like(transactions.description, `%${args.description}%`))
      .groupBy(transactions.category, transactions.parentCategory)
      .orderBy(sql`count DESC`)
      .limit(args.limit)

    return {
      suggestions: similarTransactions.map((tx) => ({
        category: tx.category,
        parentCategory: tx.parentCategory,
        frequency: tx.count,
      })),
      message: `Found ${similarTransactions.length} category suggestions for "${args.description}"`,
    }
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
    const dbQuery = db
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
