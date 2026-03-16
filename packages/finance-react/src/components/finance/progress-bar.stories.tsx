import type { Meta, StoryObj } from '@storybook/react'

import { ProgressBar } from './progress-bar'

const meta: Meta<typeof ProgressBar> = {
  title: 'Finance/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
    },
  },
}
export default meta
type Story = StoryObj<typeof ProgressBar>

export const Default: Story = {
  args: {
    progress: 50,
  },
}

export const Empty: Story = {
  args: {
    progress: 0,
  },
}

export const Full: Story = {
  args: {
    progress: 100,
  },
}

export const Partial: Story = {
  args: {
    progress: 75,
  },
}
