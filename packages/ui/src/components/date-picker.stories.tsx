import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { DatePicker } from './date-picker';

const meta: Meta<typeof DatePicker> = {
  title: 'Forms/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(undefined);
    return <DatePicker value={date} onSelect={setDate} placeholder="Pick a date" />;
  },
};

export const WithLabel: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return <DatePicker value={date} onSelect={setDate} label="Due Date" showLabel />;
  },
};

export const Disabled: Story = {
  render: () => (
    <DatePicker value={new Date()} onSelect={() => {}} disabled label="Locked Date" showLabel />
  ),
};
