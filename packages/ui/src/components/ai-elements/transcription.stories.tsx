import type { Meta, StoryObj } from '@storybook/react';
import {
  Transcription,
  TranscriptionContent,
  TranscriptionHeader,
  TranscriptionLoading,
  TranscriptionSegment,
} from './transcription';

const meta: Meta<typeof Transcription> = {
  title: 'AI Elements/Transcription',
  component: Transcription,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Transcription>;

export const Default: Story = {
  render: () => (
    <Transcription className="max-w-md border rounded-md overflow-hidden">
      <TranscriptionHeader />
      <TranscriptionContent>
        <TranscriptionSegment
          speaker="user"
          timestamp="0:05"
          text="Can you explain how the new caching system works?"
        />
        <TranscriptionSegment
          speaker="assistant"
          timestamp="0:12"
          text="Sure! The caching system uses a two-layer approach with in-memory and persistent storage."
        />
        <TranscriptionSegment
          speaker="user"
          timestamp="0:28"
          text="How does it handle cache invalidation?"
        />
      </TranscriptionContent>
    </Transcription>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="max-w-sm border rounded-md">
      <TranscriptionLoading text="Listening..." />
    </div>
  ),
};

export const SingleSegment: Story = {
  render: () => (
    <TranscriptionSegment
      speaker="user"
      timestamp="1:23"
      text="Please summarize the key points from today's meeting."
    />
  ),
};
