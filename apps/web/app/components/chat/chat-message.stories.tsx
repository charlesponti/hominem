import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn, userEvent, within } from 'storybook/test';

import { ChatMessage } from './chat-message';

const assistantMessage = {
  id: 'assistant-1',
  chatId: 'chat-1',
  content: 'Here is the answer to your question.',
  role: 'assistant',
  createdAt: '2026-08-24T17:30:00.000Z',
} as ChatMessageDto;

const meta = {
  title: 'Chat/Components/Chat Message',
  component: ChatMessage,
  args: { message: assistantMessage },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

function Harness({
  message: initialMessage = assistantMessage,
  onEdit,
  ...props
}: Partial<React.ComponentProps<typeof ChatMessage>>) {
  const [message, setMessage] = useState(initialMessage);

  return (
    <div className="w-full max-w-2xl bg-red">
      <ChatMessage
        {...props}
        message={message}
        onEdit={
          onEdit
            ? async (messageId, content) => {
                await onEdit(messageId, content);
                setMessage((current) => ({ ...current, content }));
              }
            : undefined
        }
      />
    </div>
  );
}

export const User: Story = {
  render: () => (
    <Harness
      message={{ ...assistantMessage, role: 'user', content: 'Can you help me plan this?' }}
    />
  ),
};

export const EditableUser: Story = {
  render: () => (
    <Harness
      message={{
        ...assistantMessage,
        role: 'user',
        content: 'Update this message before sending.',
      }}
      onEdit={fn()}
    />
  ),
};

export const EditingUser: Story = {
  render: () => (
    <Harness
      message={{ ...assistantMessage, role: 'user', content: 'This message is being edited.' }}
      onEdit={fn()}
    />
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit message' }));
  },
};

export const EditSaveFailure: Story = {
  render: () => (
    <Harness
      message={{ ...assistantMessage, role: 'user', content: 'Try saving this edit.' }}
      onEdit={async () => {
        throw new Error('Unable to update this message.');
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit message' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Save edit' }));
  },
};

export const Assistant: Story = {
  render: () => <Harness message={assistantMessage} speechSrc="/speech/assistant-1" />,
};

export const AssistantActions: Story = {
  render: () => <Harness />,
};

export const ReasoningExample: Story = {
  render: () => (
    <Harness
      formatTimestamp={() => '10:30 AM'}
      message={{
        ...assistantMessage,
        reasoning: 'I compared the release constraints before answering.',
      }}
    />
  ),
};

export const InterruptedAssistant: Story = {
  render: () => <Harness message={{ ...assistantMessage, failed: true }} />,
};

export const DebugDetails: Story = {
  render: () => <Harness showDebug />,
};

export const RegenerableAssistant: Story = {
  render: () => <Harness onRegenerate={() => undefined} />,
};

export const ToolApproval: Story = {
  render: () => (
    <Harness
      message={{
        ...assistantMessage,
        content: '',
        toolCalls: [
          {
            toolCallId: 'tool-1',
            toolName: 'delete_note',
            type: 'tool-call',
            args: { noteId: 'note-1' },
            preview: { title: 'Draft note' },
            status: 'pending',
          },
        ],
      }}
    />
  ),
};
