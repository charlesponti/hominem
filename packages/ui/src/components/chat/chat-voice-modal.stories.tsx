import type { Meta, StoryObj } from '@storybook/react-vite';
import type { UseMutationResult } from '@tanstack/react-query';

import { ChatVoiceModal } from './chat-voice-modal';

interface TranscribeResult {
  text: string;
}

interface TranscribeVariables {
  audioBlob: Blob;
  language?: string;
}

type MockTranscribeMutation = UseMutationResult<TranscribeResult, Error, TranscribeVariables>;

const createMockTranscribeMutation = (): MockTranscribeMutation =>
  ({
    mutate: () => {},
    mutateAsync: async () => ({ text: 'Transcribed message from the recorder.' }),
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isError: false,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    reset: () => {},
    status: 'idle',
    submittedAt: 0,
    variables: undefined,
  }) as unknown as MockTranscribeMutation;

const meta = {
  title: 'Patterns/Chat/ChatVoiceModal',
  component: ChatVoiceModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ChatVoiceModal>;

export default meta;

type Story = StoryObj<typeof ChatVoiceModal>;

export const Open: Story = {
  args: {
    show: true,
    onClose: () => undefined,
    onTranscribed: () => undefined,
    transcribeMutation: createMockTranscribeMutation(),
  },
  render: (args) => (
    <div className="relative w-full bg-background" style={{ height: 560 }}>
      <ChatVoiceModal {...args} />
    </div>
  ),
};
