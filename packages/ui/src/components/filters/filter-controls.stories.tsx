import type { Meta, StoryObj } from '@storybook/react';
import { FilterControls } from './filter-controls';
import { FilterChip } from './filter-chip';

const meta: Meta<typeof FilterControls> = {
  title: 'Filters/FilterControls',
  component: FilterControls,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof FilterControls>;

export const Default: Story = {
  render: () => (
    <FilterControls>
      <select className="h-9 rounded-md border px-3 text-sm">
        <option>All statuses</option>
        <option>Active</option>
        <option>Inactive</option>
      </select>
      <select className="h-9 rounded-md border px-3 text-sm">
        <option>All types</option>
        <option>Invoice</option>
        <option>Payment</option>
      </select>
    </FilterControls>
  ),
};

export const WithActiveFilters: Story = {
  render: () => (
    <FilterControls
      showActiveFilters
      activeFilters={[
        { id: '1', label: 'Status: Active', onRemove: () => {} },
        { id: '2', label: 'Type: Invoice', onRemove: () => {} },
      ]}
    >
      <select className="h-9 rounded-md border px-3 text-sm">
        <option>Active</option>
      </select>
      <select className="h-9 rounded-md border px-3 text-sm">
        <option>Invoice</option>
      </select>
    </FilterControls>
  ),
};
