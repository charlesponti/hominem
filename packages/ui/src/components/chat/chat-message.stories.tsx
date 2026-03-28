import type { Meta, StoryObj } from '@storybook/react-vite';

import type { ExtendedMessage } from '../../types/chat';
import { ChatMessage } from './chat-message';
import {
  mockAssistantMessage,
  mockStreamingAssistantMessage,
  mockUserMessage,
} from './chat-story-data';

const meta: Meta<typeof ChatMessage> = {
  title: 'Patterns/Chat/ChatMessage',
  component: ChatMessage,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ChatMessage>;

export const UserMessage: Story = {
  args: {
    message: mockUserMessage as ExtendedMessage,
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
    message: mockAssistantMessage as ExtendedMessage,
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
    message: mockStreamingAssistantMessage as ExtendedMessage,
  },
  render: (args) => (
    <div className="w-full max-w-3xl bg-background p-4">
      <ChatMessage {...args} isStreaming />
    </div>
  ),
};
