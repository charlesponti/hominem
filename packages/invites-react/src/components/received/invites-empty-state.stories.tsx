import type { Meta, StoryObj } from '@storybook/react'
import { InvitesEmptyState } from './invites-empty-state'

const meta: Meta<typeof InvitesEmptyState> = {
  title: 'Invites/InvitesEmptyState',
  component: InvitesEmptyState,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof InvitesEmptyState>

export const Default: Story = {}
