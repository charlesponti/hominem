import type { Meta, StoryObj } from '@storybook/react'

import { TextArea } from './text-area'

const meta: Meta<typeof TextArea> = {
  title: 'UI/TextArea',
  component: TextArea,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TextArea>

export const Default: Story = {
  args: {
    label: 'Notes',
    placeholder: 'Write something...',
    rows: 5,
  },
}

export const WithHelpText: Story = {
  args: {
    label: 'Description',
    helpText: 'Keep it short and concrete.',
    rows: 4,
  },
}

export const Error: Story = {
  args: {
    label: 'Bio',
    error: 'Bio is required',
    rows: 4,
  },
}
