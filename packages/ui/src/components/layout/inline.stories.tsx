import type { Meta, StoryObj } from '@storybook/react'

import { Inline } from './inline'

const meta: Meta<typeof Inline> = {
  title: 'Layout/Inline',
  component: Inline,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Inline>

export const Default: Story = {
  render: () => (
    <Inline gap="md">
      <div className="border px-3 py-2">Alpha</div>
      <div className="border px-3 py-2">Beta</div>
      <div className="border px-3 py-2">Gamma</div>
    </Inline>
  ),
}

export const Wrapped: Story = {
  render: () => (
    <Inline gap="sm" wrap className="max-w-xs">
      <div className="border px-3 py-2">Filters</div>
      <div className="border px-3 py-2">Recent</div>
      <div className="border px-3 py-2">Unread</div>
      <div className="border px-3 py-2">Assigned</div>
    </Inline>
  ),
}
