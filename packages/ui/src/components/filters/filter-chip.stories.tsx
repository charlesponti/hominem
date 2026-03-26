import type { Meta, StoryObj } from '@storybook/react-vite';

import { FilterChip } from './filter-chip';

const meta: Meta<typeof FilterChip> = {
  title: 'Filters/FilterChip',
  component: FilterChip,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof FilterChip>;

export const Default: Story = {
  args: {
    label: 'Status: Active',
    onRemove: () => {},
  },
};

export const Clickable: Story = {
  args: {
    label: 'Category: Work',
    onRemove: () => {},
    onClick: () => {},
  },
};

export const Multiple: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <FilterChip label="Status: Active" onRemove={() => {}} />
      <FilterChip label="Type: Invoice" onRemove={() => {}} />
      <FilterChip label="Date: Last 7 days" onRemove={() => {}} />
    </div>
  ),
};
