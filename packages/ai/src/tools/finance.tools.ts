import { tool } from 'ai'
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
