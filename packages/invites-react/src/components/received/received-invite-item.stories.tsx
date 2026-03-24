import type { Meta, StoryObj } from '@storybook/react';

import { ReceivedInviteItem } from './received-invite-item';

const meta: Meta<typeof ReceivedInviteItem> = {
  title: 'Invites/ReceivedInviteItem',
  component: ReceivedInviteItem,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ReceivedInviteItem>;

const pendingInvite = {
  id: 'inv-1',
  listId: 'list-1',
  invitedUserEmail: 'jane@example.com',
  token: 'abc123',
  status: 'pending' as const,
  list: { id: 'list-1', name: 'Weekend Trip' },
};

const acceptedInvite = {
  ...pendingInvite,
  status: 'accepted' as const,
};

export const Pending: Story = {
  args: {
    listInvite: pendingInvite,
    currentUserEmail: 'jane@example.com',
    canAccept: true,
  },
};

export const Accepted: Story = {
  args: {
    listInvite: acceptedInvite,
    currentUserEmail: 'jane@example.com',
  },
};

export const EmailMismatch: Story = {
  args: {
    listInvite: pendingInvite,
    currentUserEmail: 'other@example.com',
    canAccept: true,
  },
};

export const CannotAccept: Story = {
  args: {
    listInvite: pendingInvite,
    canAccept: false,
  },
};

export const Preview: Story = {
  args: {
    variant: 'preview',
    preview: {
      listName: 'Weekend Trip',
      firstItemName: 'Sunscreen',
      invitedUserEmail: 'jane@example.com',
    },
  },
};

export const PreviewWithPhoto: Story = {
  args: {
    variant: 'preview',
    preview: {
      listName: 'Camping Gear',
      coverPhoto: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400',
      firstItemName: 'Tent',
    },
  },
};
