import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChatHeader } from './chat-header';

const meta = {
  title: 'Patterns/Chat/ChatHeader',
  component: ChatHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof ChatHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    searchQuery: '',
    searchInputRef: { current: null },
    onChangeSearchQuery: () => undefined,
  },
};

export const WithQuery: Story = {
  args: {
    searchQuery: 'onboarding',
    searchInputRef: { current: null },
    onChangeSearchQuery: () => undefined,
  },
};
