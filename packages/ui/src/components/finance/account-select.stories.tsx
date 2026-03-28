import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { AccountSelect, type AccountOption } from './account-select';

const accounts: AccountOption[] = [
  { id: 'all-checking', name: 'Daily Checking' },
  { id: 'travel-card', name: 'Travel Rewards Card' },
  { id: 'savings', name: 'Emergency Savings' },
];

const meta: Meta<typeof AccountSelect> = {
  title: 'Patterns/Finance/AccountSelect',
  component: AccountSelect,
  tags: ['autodocs'],
  args: {
    selectedAccount: 'all',
    accounts,
    isLoading: false,
    placeholder: 'All accounts',
    label: 'Account',
    showLabel: false,
  },
  render: (args) => {
    const [selectedAccount, setSelectedAccount] = useState(args.selectedAccount);

    return (
      <AccountSelect
        {...args}
        selectedAccount={selectedAccount}
        onAccountChange={setSelectedAccount}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    showLabel: true,
  },
};

export const Loading: Story = {
  args: {
    accounts: [],
    isLoading: true,
    showLabel: true,
  },
};

export const Empty: Story = {
  args: {
    accounts: [],
    showLabel: true,
  },
};
