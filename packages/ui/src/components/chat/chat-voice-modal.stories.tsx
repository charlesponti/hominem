import type { Meta, StoryObj } from '@storybook/react';
import type { UseMutationResult } from '@tanstack/react-query';

import { ChatVoiceModal } from './chat-voice-modal';

interface TranscribeResult {
  text: string;
}

interface TranscribeVariables {
  audioBlob: Blob;
  language?: string;
}

const mockTranscribeMutation = {
  mutateAsync: async () => ({ text: 'Transcribed message from the recorder.' }),
  error: null,
} as UseMutationResult<TranscribeResult, Error, TranscribeVariables>;

const meta = {
  title: 'Chat/ChatVoiceModal',
  component: ChatVoiceModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ChatVoiceModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    show: true,
    onClose: () => undefined,
    onTranscribed: () => undefined,
    transcribeMutation: mockTranscribeMutation,
  },
  render: (args) => (
    <div className="relative w-full bg-background" style={{ height: 560 }}>
      <ChatVoiceModal {...args} />
    </div>
  ),
};
