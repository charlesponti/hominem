import type { Meta, StoryObj } from '@storybook/react-vite';

import { SentInviteForm } from './sent-invite-form';

const meta: Meta<typeof SentInviteForm> = {
  title: 'Invites/SentInviteForm',
  component: SentInviteForm,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof SentInviteForm>;

export const Default: Story = {
  args: {
    listId: 'list-1',
  },
};

export const WithCallback: Story = {
  args: {
    listId: 'list-1',
    onCreate: (invite) => console.log('Invite created:', invite),
  },
};
