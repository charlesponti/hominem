import type { Meta, StoryObj } from '@storybook/react-vite';

import { TopMerchants } from './top-merchants';

const meta: Meta<typeof TopMerchants> = {
  title: 'Finance/Analytics/TopMerchants',
  component: TopMerchants,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof TopMerchants>;

export const Default: Story = {
  args: {
    selectedAccount: 'all',
  },
};

export const WithDateRange: Story = {
  args: {
    dateFrom: new Date('2024-01-01'),
    dateTo: new Date('2024-12-31'),
    selectedAccount: 'all',
  },
};
