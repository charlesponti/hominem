import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Calendar } from './calendar';

const meta: Meta<typeof Calendar> = {
  title: 'Data Display/Calendar',
  component: Calendar,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return (
      <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
    );
  },
};

export const WithoutOutsideDays: Story = {
  render: () => <Calendar mode="single" showOutsideDays={false} className="rounded-md border" />,
};

export const RangeMode: Story = {
  render: () => <Calendar mode="range" className="rounded-md border" />,
};
