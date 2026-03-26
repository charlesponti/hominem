import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef } from 'react';

import { ChatHeader } from './chat-header';

const meta = {
  title: 'Chat/ChatHeader',
  component: ChatHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof ChatHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

function ChatHeaderPreview({ searchQuery }: { searchQuery: string }) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full bg-background">
      <ChatHeader
        searchQuery={searchQuery}
        searchInputRef={searchInputRef}
        onChangeSearchQuery={() => undefined}
      />
    </div>
  );
}

export const Empty: Story = {
  render: () => <ChatHeaderPreview searchQuery="" />,
};

export const WithQuery: Story = {
  render: () => <ChatHeaderPreview searchQuery="onboarding" />,
};
