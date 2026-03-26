import type { Meta, StoryObj } from '@storybook/react-vite';

import { VoiceModeOverlay } from './voice-mode-overlay';

const meta = {
  title: 'Chat/VoiceModeOverlay',
  component: VoiceModeOverlay,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof VoiceModeOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Listening: Story = {
  args: {
    visible: true,
    state: 'listening',
    canStop: true,
    onClose: () => undefined,
    onStartRecording: () => undefined,
    onStopRecording: () => undefined,
  },
  render: (args) => (
    <div className="relative w-full bg-background" style={{ height: 480 }}>
      <VoiceModeOverlay {...args} />
    </div>
  ),
};

export const Processing: Story = {
  args: {
    visible: true,
    state: 'processing',
    canStop: false,
    onClose: () => undefined,
    onStartRecording: () => undefined,
    onStopRecording: () => undefined,
  },
  render: (args) => (
    <div className="relative w-full bg-background" style={{ height: 480 }}>
      <VoiceModeOverlay {...args} />
    </div>
  ),
};

export const ErrorState: Story = {
  args: {
    visible: true,
    state: 'error',
    errorMessage: 'The microphone permission was blocked.',
    canStop: false,
    onClose: () => undefined,
    onStartRecording: () => undefined,
    onStopRecording: () => undefined,
  },
  render: (args) => (
    <div className="relative w-full bg-background" style={{ height: 480 }}>
      <VoiceModeOverlay {...args} />
    </div>
  ),
};
