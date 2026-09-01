import type { ChatMessageItem } from '@hominem/chat/types';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessageSquareIcon } from 'lucide-react';

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
} from './conversation';
import { Message, MessageContent, MessageResponse } from './message';

const meta = {
  title: 'Chat/Primitives/Conversation',
  component: Conversation,
  parameters: { layout: 'centered' },
  args: { children: null },
} satisfies Meta<typeof Conversation>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMessages: ChatMessageItem[] = [
  {
    id: 'm1',
    role: 'user',
    message: 'Can you summarize the quarterly report?',
    created_at: '2026-08-24T17:29:00.000Z',
    chat_id: 'chat-1',
    profile_id: 'profile-1',
    toolCalls: null,
  },
  {
    id: 'm2',
    role: 'assistant',
    message: 'Revenue is up 12% quarter over quarter, driven mostly by new enterprise deals.',
    created_at: '2026-08-24T17:30:00.000Z',
    chat_id: 'chat-1',
    profile_id: 'profile-1',
    toolCalls: null,
  },
];

export const WithMessages: Story = {
  render: () => (
    <div className="relative h-96 w-96 rounded-lg border">
      <Conversation>
        <ConversationContent>
          {sampleMessages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                <MessageResponse>{message.message}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <ConversationDownload messages={sampleMessages} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="h-96 w-96 rounded-lg border">
      <Conversation>
        <ConversationContent>
          <ConversationEmptyState icon={<MessageSquareIcon className="size-8" />} />
        </ConversationContent>
      </Conversation>
    </div>
  ),
};

export const EmptyWithCustomCopy: Story = {
  render: () => (
    <div className="h-96 w-96 rounded-lg border">
      <Conversation>
        <ConversationContent>
          <ConversationEmptyState
            description="Ask a question to get started."
            title="Nothing here yet"
          />
        </ConversationContent>
      </Conversation>
    </div>
  ),
};
