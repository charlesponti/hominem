import type { Meta, StoryObj } from '@storybook/react';

import { SearchInput } from './search-input';

const meta: Meta<typeof SearchInput> = {
  title: 'Forms/SearchInput',
  component: SearchInput,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {
  args: {
    placeholder: 'Search...',
    onSearchChange: () => {},
  },
};

export const WithValue: Story = {
  args: {
    value: 'react',
    placeholder: 'Search...',
    onSearchChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Search...',
    disabled: true,
    onSearchChange: () => {},
  },
};
