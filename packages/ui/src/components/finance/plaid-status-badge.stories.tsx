import type { Meta, StoryObj } from '@storybook/react-vite';

import { PlaidStatusBadge } from './plaid-status-badge';

const meta: Meta<typeof PlaidStatusBadge> = {
  title: 'Patterns/Finance/PlaidStatusBadge',
  component: PlaidStatusBadge,
  tags: ['autodocs'],
  args: {
    status: 'active',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {};

export const Error: Story = {
  args: {
    status: 'error',
  },
};

export const PendingExpiration: Story = {
  args: {
    status: 'pending_expiration',
  },
};

export const Revoked: Story = {
  args: {
    status: 'revoked',
  },
};

export const Unknown: Story = {
  args: {
    status: null,
  },
};
