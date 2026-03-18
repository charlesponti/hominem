import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'

import { AccountSelect } from './account-select'

const meta: Meta<typeof AccountSelect> = {
  title: 'Finance/AccountSelect',
  component: AccountSelect,
  tags: ['autodocs'],
  argTypes: {
    isLoading: { control: 'boolean' },
    showLabel: { control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<typeof AccountSelect>

const sampleAccounts = [
  { id: 'acc-1', name: 'Chase Checking' },
  { id: 'acc-2', name: 'Chase Savings' },
  { id: 'acc-3', name: 'Amex Gold' },
  { id: 'acc-4', name: 'Capital One' },
]

export const Default: Story = {
  args: {
    selectedAccount: 'all',
    onAccountChange: fn(),
    accounts: sampleAccounts,
    label: 'Account',
  },
}

export const WithSelectedAccount: Story = {
  args: {
    selectedAccount: 'acc-1',
    onAccountChange: fn(),
    accounts: sampleAccounts,
    label: 'Account',
  },
}

export const WithLabel: Story = {
  args: {
    selectedAccount: 'all',
    onAccountChange: fn(),
    accounts: sampleAccounts,
    showLabel: true,
    label: 'Account',
  },
}

export const Loading: Story = {
  args: {
    selectedAccount: 'all',
    onAccountChange: fn(),
    accounts: [],
    isLoading: true,
    label: 'Account',
  },
}

export const Empty: Story = {
  args: {
    selectedAccount: 'all',
    onAccountChange: fn(),
    accounts: [],
    isLoading: false,
    label: 'Account',
  },
}
