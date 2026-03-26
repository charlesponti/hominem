import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChatShimmerMessage } from './chat-shimmer-message';

const meta = {
  title: 'Chat/ChatShimmerMessage',
  component: ChatShimmerMessage,
  tags: ['autodocs'],
} satisfies Meta<typeof ChatShimmerMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-full max-w-3xl bg-background p-4">
      <ChatShimmerMessage />
    </div>
  ),
};
