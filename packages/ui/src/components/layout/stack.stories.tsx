import type { Meta, StoryObj } from '@storybook/react'

import { Stack } from './stack'

const meta: Meta<typeof Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Stack>

export const Default: Story = {
  render: () => (
    <Stack gap="md" className="w-80">
      <div className="border p-3">First item</div>
      <div className="border p-3">Second item</div>
      <div className="border p-3">Third item</div>
    </Stack>
  ),
}

export const WithDividers: Story = {
  render: () => (
    <Stack gap="sm" divider={<div className="border-t border-border" />} className="w-80">
      <div className="py-2">Profile</div>
      <div className="py-2">Security</div>
      <div className="py-2">Notifications</div>
    </Stack>
  ),
}
