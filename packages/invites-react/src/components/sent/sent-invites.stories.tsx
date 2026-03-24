import type { Meta, StoryObj } from '@storybook/react';

import { SentInvites } from './sent-invites';

const meta: Meta<typeof SentInvites> = {
  title: 'Invites/SentInvites',
  component: SentInvites,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof SentInvites>;

const invites = [
  {
    listId: 'list-1',
    invitedUserEmail: 'alice@example.com',
    token: 'tok-1',
    accepted: true,
    user_invitedUserId: { id: 'u1', name: 'Alice', email: 'alice@example.com' },
  },
  {
    listId: 'list-1',
    invitedUserEmail: 'bob@example.com',
    token: 'tok-2',
    accepted: false,
    user_invitedUserId: null,
  },
  {
    listId: 'list-1',
    invitedUserEmail: 'carol@example.com',
    token: 'tok-3',
    accepted: false,
    user_invitedUserId: null,
  },
];

export const WithInvites: Story = {
  args: {
    invites,
    listId: 'list-1',
  },
};

export const Empty: Story = {
  args: {
    invites: [],
    listId: 'list-1',
  },
};
