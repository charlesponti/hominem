import type { Meta, StoryObj } from '@storybook/react';

import { ChatMessages } from './chat-messages';
import { mockChatMessages } from './chat-story-data';

const meta = {
  title: 'Chat/ChatMessages',
  component: ChatMessages,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ChatMessages>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Conversation: Story = {
  args: {
    messages: mockChatMessages,
    status: 'streaming',
    speakingId: null,
    speechLoadingId: null,
  },
  render: (args) => (
    <div className="w-full bg-background" style={{ height: 720 }}>
      <ChatMessages
        {...args}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onRegenerate={() => undefined}
        onSpeak={() => undefined}
      />
    </div>
  ),
};

export const EmptyLoading: Story = {
  args: {
    messages: [],
    isLoading: true,
  },
  render: (args) => (
    <div className="w-full bg-background" style={{ height: 360 }}>
      <ChatMessages {...args} />
    </div>
  ),
};
