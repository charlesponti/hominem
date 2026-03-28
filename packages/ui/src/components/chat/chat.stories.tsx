import type { Meta, StoryObj } from '@storybook/react-vite';

import { Chat } from './chat';
import { mockChatMessages, mockSessionSources, renderChatIcon } from './chat-story-data';

const meta = {
  title: 'Patterns/Chat/Chat',
  component: Chat,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Chat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    source: mockSessionSources.note,
    statusCopy: 'Active conversation',
    resolvedSource: mockSessionSources.note,
    renderIcon: renderChatIcon,
    messages: mockChatMessages,
    status: 'streaming',
    isLoading: false,
    showDebug: false,
    isVoiceModeActive: false,
    voiceModeState: 'idle',
    isVoiceModeRecording: false,
  },
  render: (args) => (
    <div className="w-full bg-background" style={{ height: 760 }}>
      <Chat {...args} />
    </div>
  ),
};

export const VoiceModeActive: Story = {
  args: {
    source: mockSessionSources.thought,
    statusCopy: 'Voice mode',
    resolvedSource: mockSessionSources.thought,
    renderIcon: renderChatIcon,
    messages: mockChatMessages.slice(0, 2),
    status: 'idle',
    isVoiceModeActive: true,
    voiceModeState: 'listening',
    isVoiceModeRecording: true,
  },
  render: (args) => (
    <div className="w-full bg-background" style={{ height: 760 }}>
      <Chat {...args} />
    </div>
  ),
};
