import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ChatMessage } from './chat-message';

const meta = {
  title: 'Chat/Regeneration',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const messages = [
  { id: 'user-1', role: 'user', content: 'What should I focus on today?' },
  { id: 'assistant-1', role: 'assistant', content: 'Start with the most important task.' },
  { id: 'user-2', role: 'user', content: 'How should I plan the afternoon?' },
  { id: 'assistant-2', role: 'assistant', content: 'Reserve time for focused work and review.' },
  { id: 'user-3', role: 'user', content: 'What should I do before I finish?' },
  { id: 'assistant-3', role: 'assistant', content: 'Capture the next steps for tomorrow.' },
] as const;

function toMessage(message: (typeof messages)[number]): ChatMessageDto {
  return {
    ...message,
    chatId: 'chat-1',
  } as ChatMessageDto;
}

function ConversationHarness({ initialActiveId }: { initialActiveId?: string }) {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(initialActiveId ?? null);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 bg-background p-6">
      <p className="text-sm text-muted-foreground">
        Select any assistant response to regenerate it. The middle response remains in context while
        the final response is regenerated.
      </p>
      {messages.map((message) => (
        <ChatMessage
          isRegenerating={activeMessageId === message.id}
          key={message.id}
          message={toMessage(message)}
          onRegenerate={
            message.role === 'assistant' ? (messageId) => setActiveMessageId(messageId) : undefined
          }
        />
      ))}
      {activeMessageId ? (
        <button
          className="self-start text-sm text-muted-foreground underline"
          onClick={() => setActiveMessageId(null)}
          type="button"
        >
          Finish regeneration
        </button>
      ) : null}
    </div>
  );
}

export const ConversationOrdering: Story = {
  render: () => <ConversationHarness />,
  parameters: {
    docs: {
      description: {
        story:
          'Behavior harness for regenerating middle and final assistant messages without duplicating snapshots.',
      },
    },
  },
};

export const RegeneratingMiddle: Story = {
  render: () => <ConversationHarness initialActiveId="assistant-2" />,
};

export const RegeneratingFinal: Story = {
  render: () => <ConversationHarness initialActiveId="assistant-3" />,
};
