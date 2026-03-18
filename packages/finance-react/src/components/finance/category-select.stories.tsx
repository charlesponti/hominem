import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'

import { TagSelect } from './category-select'

const meta: Meta<typeof TagSelect> = {
  title: 'Finance/CategorySelect',
  component: TagSelect,
  tags: ['autodocs'],
  argTypes: {
    isLoading: { control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<typeof TagSelect>

const sampleTags = [
  { id: 'food', name: 'Food & Dining' },
  { id: 'transport', name: 'Transportation' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'entertainment', name: 'Entertainment' },
]

export const Default: Story = {
  args: {
    selectedTag: 'all',
    onTagChange: fn(),
    tags: sampleTags,
    label: 'Category',
  },
}

export const WithSelectedTag: Story = {
  args: {
    selectedTag: 'food',
    onTagChange: fn(),
    tags: sampleTags,
    label: 'Category',
  },
}

export const Loading: Story = {
  args: {
    selectedTag: 'all',
    onTagChange: fn(),
    tags: [],
    isLoading: true,
    label: 'Category',
  },
}

export const Empty: Story = {
  args: {
    selectedTag: 'all',
    onTagChange: fn(),
    tags: [],
    isLoading: false,
    label: 'Category',
  },
}
