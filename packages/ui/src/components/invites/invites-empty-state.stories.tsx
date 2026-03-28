import type { Meta, StoryObj } from '@storybook/react-vite';

import { InvitesEmptyState } from './invites-empty-state';

const meta: Meta<typeof InvitesEmptyState> = {
  title: 'Patterns/Invites/InvitesEmptyState',
  component: InvitesEmptyState,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InPanel: Story = {
  render: () => (
    <div className="max-w-xl rounded-xl border border-border-default bg-base p-6">
      <InvitesEmptyState />
    </div>
  ),
};
