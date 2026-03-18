import type { Meta, StoryObj } from '@storybook/react'
import { PlaidStatusBadge } from './plaid-status-badge'

const meta: Meta<typeof PlaidStatusBadge> = {
  title: 'Finance/PlaidStatusBadge',
  component: PlaidStatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['active', 'error', 'pending_expiration', 'revoked', null],
    },
  },
}

export default meta

type Story = StoryObj<typeof PlaidStatusBadge>

export const Active: Story = {
  args: {
    status: 'active',
  },
}

export const Error: Story = {
  args: {
    status: 'error',
  },
}

export const PendingExpiration: Story = {
  args: {
    status: 'pending_expiration',
  },
}

export const Revoked: Story = {
  args: {
    status: 'revoked',
  },
}

export const Unknown: Story = {
  args: {
    status: null,
  },
}
