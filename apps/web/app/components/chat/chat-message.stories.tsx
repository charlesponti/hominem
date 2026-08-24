import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';

import { ChatMessage } from './chat-message';

const meta = {
  title: 'Chat/Components/Chat Message',
  component: ChatMessage,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

const assistantMessage = {
  id: 'assistant-1',
  chatId: 'chat-1',
  content: 'Here is the answer to your question.',
  role: 'assistant',
} as ChatMessageDto;

export const User: Story = {
  args: {
    message: { ...assistantMessage, role: 'user', content: 'Can you help me plan this?' },
  },
};

export const EditableUser: Story = {
  args: {
    message: { ...assistantMessage, role: 'user', content: 'Update this message before sending.' },
    onEdit: fn(),
  },
};

export const EditingUser: Story = {
  args: {
    message: { ...assistantMessage, role: 'user', content: 'This message is being edited.' },
    onEdit: fn(),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit message' }));
  },
};

export const EditSaveFailure: Story = {
  args: {
    message: { ...assistantMessage, role: 'user', content: 'Try saving this edit.' },
    onEdit: async () => {
      throw new Error('Unable to update this message.');
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit message' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Save edit' }));
  },
};

export const Assistant: Story = {
  args: {
    message: assistantMessage,
    speechSrc: '/speech/assistant-1',
    onActivateSpeech: () => undefined,
    onDeactivateSpeech: () => undefined,
  },
};

export const RegenerableAssistant: Story = {
  args: {
    message: assistantMessage,
    onRegenerate: () => undefined,
  },
};

export const ToolApproval: Story = {
  args: {
    message: {
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
    },
    onApproveTool: () => undefined,
    onRejectTool: () => undefined,
  },
};
