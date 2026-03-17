import type { Meta, StoryObj } from '@storybook/react'

import { TransactionsList } from './transactions-list'

const meta: Meta<typeof TransactionsList> = {
  title: 'Finance/TransactionsList',
  component: TransactionsList,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof TransactionsList>

const sampleTransactions = [
  { id: '1', amount: -125.5, description: 'Whole Foods Market', type: 'groceries', accountId: 'acc-1' },
  { id: '2', amount: 3200, description: 'Payroll Deposit', type: 'income', accountId: 'acc-2' },
  { id: '3', amount: -45.99, description: 'Netflix', type: 'subscription', accountId: 'acc-1' },
  { id: '4', amount: -85, description: 'Gas Station', type: 'transportation', accountId: 'acc-3' },
]

const sampleAccounts = new Map([
  ['acc-1', { id: 'acc-1', name: 'Chase Checking' }],
  ['acc-2', { id: 'acc-2', name: 'Chase Savings' }],
  ['acc-3', { id: 'acc-3', name: 'Amex Gold' }],
])

export const Default: Story = {
  args: {
    loading: false,
    error: null,
    transactions: sampleTransactions,
    accountsMap: sampleAccounts,
  },
}

export const Loading: Story = {
  args: {
    loading: true,
    error: null,
    transactions: [],
    accountsMap: new Map(),
  },
}

export const Error: Story = {
  args: {
    loading: false,
    error: 'Failed to load transactions',
    transactions: [],
    accountsMap: new Map(),
  },
}

export const Empty: Story = {
  args: {
    loading: false,
    error: null,
    transactions: [],
    accountsMap: sampleAccounts,
  },
}
