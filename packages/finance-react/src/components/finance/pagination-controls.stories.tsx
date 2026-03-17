import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'

import { PaginationControls } from './pagination-controls'

const meta: Meta<typeof PaginationControls> = {
  title: 'Finance/PaginationControls',
  component: PaginationControls,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof PaginationControls>

export const Default: Story = {
  args: {
    currentPage: 0,
    totalPages: 5,
    onPageChange: fn(),
  },
}

export const MiddlePage: Story = {
  args: {
    currentPage: 2,
    totalPages: 5,
    onPageChange: fn(),
  },
}

export const LastPage: Story = {
  args: {
    currentPage: 4,
    totalPages: 5,
    onPageChange: fn(),
  },
}

export const SinglePage: Story = {
  args: {
    currentPage: 0,
    totalPages: 1,
    onPageChange: fn(),
  },
}
