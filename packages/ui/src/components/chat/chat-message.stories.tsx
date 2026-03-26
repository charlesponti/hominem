import type { Meta, StoryObj } from '@storybook/react';

import { ChatMessage } from './chat-message';
import {
  mockAssistantMessage,
  mockStreamingAssistantMessage,
  mockUserMessage,
} from './chat-story-data';

const meta = {
  title: 'Chat/ChatMessage',
  component: ChatMessage,
  tags: ['autodocs'],
} satisfies Meta<typeof ChatMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UserMessage: Story = {
  args: {
    message: mockUserMessage,
    onEdit: () => undefined,
    onDelete: () => undefined,
  },
  render: (args) => (
    <div className="w-full max-w-3xl bg-background p-4">
      <ChatMessage {...args} />
    </div>
  ),
};

export const AssistantReply: Story = {
  args: {
    message: mockAssistantMessage,
    onRegenerate: () => undefined,
    onSpeak: () => undefined,
  },
  render: (args) => (
    <div className="w-full max-w-3xl bg-background p-4">
      <ChatMessage {...args} />
    </div>
  ),
};

export const StreamingAssistant: Story = {
  args: {
    message: mockStreamingAssistantMessage,
  },
  render: (args) => (
    <div className="w-full max-w-3xl bg-background p-4">
      <ChatMessage {...args} isStreaming />
    </div>
  ),
};
