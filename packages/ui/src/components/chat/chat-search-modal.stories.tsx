import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChatSearchModal } from './chat-search-modal';

const meta = {
  title: 'Chat/ChatSearchModal',
  component: ChatSearchModal,
  tags: ['autodocs'],
} satisfies Meta<typeof ChatSearchModal>;

export default meta;

type Story = StoryObj<typeof ChatSearchModal>;

export const Empty: Story = {
  args: {
    visible: true,
    searchQuery: '',
    resultCount: 0,
    searchInputRef: { current: null },
    onClose: () => undefined,
    onChangeSearchQuery: () => undefined,
  },
};

export const WithResults: Story = {
  args: {
    visible: true,
    searchQuery: 'plan',
    resultCount: 4,
    searchInputRef: { current: null },
    onClose: () => undefined,
    onChangeSearchQuery: () => undefined,
  },
};
