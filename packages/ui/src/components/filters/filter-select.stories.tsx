import type { Meta } from '@storybook/react';
import { useState } from 'react';
import { FilterSelect } from './filter-select';

const meta: Meta<typeof FilterSelect> = {
  title: 'Filters/FilterSelect',
  component: FilterSelect,
  tags: ['autodocs'],
};
export default meta;

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

export const Default = {
  render: () => {
    const [value, setValue] = useState<string | ''>('');
    return (
      <FilterSelect
        label="Status"
        value={value}
        options={statusOptions}
        onChange={setValue}
        placeholder="All"
        className="max-w-[200px]"
      />
    );
  },
};

export const WithSelection = {
  render: () => {
    const [value, setValue] = useState<string | ''>('active');
    return (
      <FilterSelect
        label="Status"
        value={value}
        options={statusOptions}
        onChange={setValue}
        placeholder="All"
        className="max-w-[200px]"
      />
    );
  },
};

export const MultipleSelects = {
  render: () => {
    const [status, setStatus] = useState<string | ''>('');
    const [type, setType] = useState<string | ''>('');
    return (
      <div className="flex gap-4">
        <FilterSelect
          label="Status"
          value={status}
          options={statusOptions}
          onChange={setStatus}
          placeholder="All statuses"
        />
        <FilterSelect
          label="Type"
          value={type}
          options={[
            { value: 'invoice', label: 'Invoice' },
            { value: 'payment', label: 'Payment' },
            { value: 'refund', label: 'Refund' },
          ]}
          onChange={setType}
          placeholder="All types"
        />
      </div>
    );
  },
};
