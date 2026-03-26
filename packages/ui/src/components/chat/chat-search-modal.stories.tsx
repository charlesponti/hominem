import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';

import { ChatSearchModal } from './chat-search-modal';

const meta = {
  title: 'Chat/ChatSearchModal',
  component: ChatSearchModal,
  tags: ['autodocs'],
} satisfies Meta<typeof ChatSearchModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function ChatSearchModalPreview({
  searchQuery,
  resultCount,
}: {
  searchQuery: string;
  resultCount: number;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative w-full bg-background" style={{ height: 320 }}>
      <ChatSearchModal
        visible
        searchQuery={searchQuery}
        resultCount={resultCount}
        searchInputRef={searchInputRef}
        onClose={() => undefined}
        onChangeSearchQuery={() => undefined}
      />
    </div>
  );
}

export const Empty: Story = {
  render: () => <ChatSearchModalPreview searchQuery="" resultCount={0} />,
};

export const WithResults: Story = {
  render: () => <ChatSearchModalPreview searchQuery="plan" resultCount={4} />,
};
