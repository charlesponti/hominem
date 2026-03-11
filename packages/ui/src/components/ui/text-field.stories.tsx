import type { Meta, StoryObj } from '@storybook/react'

import { TextField } from './text-field'

const meta: Meta<typeof TextField> = {
  title: 'UI/TextField',
  component: TextField,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TextField>

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    type: 'email',
  },
}

export const WithHelpText: Story = {
  args: {
    label: 'Search',
    helpText: 'Press Enter to submit',
    placeholder: 'Search notes',
    type: 'search',
  },
}

export const Error: Story = {
  args: {
    label: 'Password',
    error: 'Password is required',
    type: 'password',
  },
}
