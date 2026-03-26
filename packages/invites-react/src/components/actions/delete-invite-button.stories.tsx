import type { Meta, StoryObj } from '@storybook/react-vite';

import { DeleteInviteButton } from './delete-invite-button';

const meta: Meta<typeof DeleteInviteButton> = {
  title: 'Invites/DeleteInviteButton',
  component: DeleteInviteButton,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof DeleteInviteButton>;

export const Default: Story = {
  args: {
    listId: 'list-1',
    invitedUserEmail: 'jane@example.com',
    onDelete: (email) => console.log('Deleted:', email),
  },
};
