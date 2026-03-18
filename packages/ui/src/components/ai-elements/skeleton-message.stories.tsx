import type { Meta, StoryObj } from '@storybook/react'
import { SkeletonMessage } from './skeleton-message'

const meta: Meta<typeof SkeletonMessage> = {
  title: 'AI Elements/SkeletonMessage',
  component: SkeletonMessage,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof SkeletonMessage>

export const Default: Story = {}

export const Multiple: Story = {
  render: () => (
    <div className="space-y-4 max-w-lg">
      <SkeletonMessage />
      <SkeletonMessage />
      <SkeletonMessage />
    </div>
  ),
}
