import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChatThinkingIndicator } from './chat-thinking-indicator';

const meta = {
  title: 'Patterns/Chat/ChatThinkingIndicator',
  component: ChatThinkingIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof ChatThinkingIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-full bg-background p-4">
      <ChatThinkingIndicator />
    </div>
  ),
};
