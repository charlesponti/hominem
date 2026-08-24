import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChatConversationActions } from './chat-conversation-actions';

const meta = {
  title: 'Chat/Conversation Actions',
  component: ChatConversationActions,
  parameters: { layout: 'centered' },
  args: {
    onArchive: () => undefined,
    onNewChat: () => undefined,
    onResponseSettings: () => undefined,
    onSearch: () => undefined,
  },
} satisfies Meta<typeof ChatConversationActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Archiving: Story = { args: { isArchiving: true } };
export const SearchOpen: Story = { args: { isSearchOpen: true } };
