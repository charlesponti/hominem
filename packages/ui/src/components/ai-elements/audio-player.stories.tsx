import type { Meta, StoryObj } from '@storybook/react';

import { AudioPlayer, AudioPlayerPlayButton, AudioPlayerProgress } from './audio-player';

const meta: Meta<typeof AudioPlayer> = {
  title: 'AI Elements/AudioPlayer',
  component: AudioPlayer,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AudioPlayer>;

export const Default: Story = {
  render: () => <AudioPlayer className="max-w-sm" />,
};

export const PlayButton: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <AudioPlayerPlayButton isPlaying={false} />
      <AudioPlayerPlayButton isPlaying={true} />
    </div>
  ),
};

export const Progress: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-64">
      <AudioPlayerProgress progress={0} />
      <AudioPlayerProgress progress={0.33} />
      <AudioPlayerProgress progress={0.66} />
      <AudioPlayerProgress progress={1} />
    </div>
  ),
};
