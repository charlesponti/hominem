import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { SpeechPlayer } from './speech-player';

const meta = {
  title: 'Chat/Components/Speech Player',
  component: SpeechPlayer,
  parameters: { layout: 'centered' },
  args: {
    isActive: false,
    messageId: 'message-1',
    onActivate: fn(),
    onDeactivate: fn(),
    src: '/audio/example.mp3',
  },
} satisfies Meta<typeof SpeechPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
export const Active: Story = { args: { isActive: true } };
export const ReducedMotion: Story = {
  parameters: { reducedMotion: 'reduce' },
  args: { isActive: true },
};
