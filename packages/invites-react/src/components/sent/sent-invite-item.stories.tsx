import type { Meta, StoryObj } from '@storybook/react'
import { SentInviteItem } from './sent-invite-item'

const meta: Meta<typeof SentInviteItem> = {
  title: 'Invites/SentInviteItem',
  component: SentInviteItem,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof SentInviteItem>

const pendingInvite = {
  accepted: false,
  invitedUserEmail: 'jane@example.com',
  token: 'abc123',
  user_invitedUserId: null,
}

const acceptedInvite = {
  accepted: true,
  invitedUserEmail: 'jane@example.com',
  token: 'abc123',
  user_invitedUserId: { id: 'user-1', name: 'Jane Smith', email: 'jane@example.com' },
}

export const Pending: Story = {
  args: {
    invite: pendingInvite,
    listId: 'list-1',
    onDelete: (email) => console.log('Delete:', email),
    baseUrl: 'https://app.example.com',
  },
}

export const Accepted: Story = {
  args: {
    invite: acceptedInvite,
    listId: 'list-1',
    onDelete: (email) => console.log('Delete:', email),
    baseUrl: 'https://app.example.com',
  },
}

export const AcceptedWithRemoveControl: Story = {
  args: {
    invite: acceptedInvite,
    listId: 'list-1',
    onDelete: (email) => console.log('Delete:', email),
    baseUrl: 'https://app.example.com',
    removeCollaboratorControl: (
      <button type="button" className="text-sm text-destructive">Remove</button>
    ),
  },
}
