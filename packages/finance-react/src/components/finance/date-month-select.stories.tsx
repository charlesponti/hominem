import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'

import { DateMonthSelect, getCurrentMonthYear } from './date-month-select'

const meta: Meta<typeof DateMonthSelect> = {
  title: 'Finance/DateMonthSelect',
  component: DateMonthSelect,
  tags: ['autodocs'],
  argTypes: {
    monthsBack: { control: { type: 'number', min: 1, max: 36 } },
  },
}
export default meta
type Story = StoryObj<typeof DateMonthSelect>

export const Default: Story = {
  args: {
    selectedMonthYear: getCurrentMonthYear(),
    onMonthChange: fn(),
    monthsBack: 12,
  },
}

export const FewMonths: Story = {
  args: {
    selectedMonthYear: getCurrentMonthYear(),
    onMonthChange: fn(),
    monthsBack: 3,
  },
}

export const ManyMonths: Story = {
  args: {
    selectedMonthYear: getCurrentMonthYear(),
    onMonthChange: fn(),
    monthsBack: 24,
  },
}
