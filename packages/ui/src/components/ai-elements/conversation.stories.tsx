import type { Meta, StoryObj } from '@storybook/react';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from './conversation';

const meta: Meta<typeof Conversation> = {
  title: 'AI Elements/Conversation',
  component: Conversation,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Conversation>;

export const Default: Story = {
  render: () => (
    <Conversation className="max-w-md border rounded-md overflow-hidden">
      <ConversationContent className="p-4">
        <div className="bg-muted rounded-md p-3 max-w-[80%] self-start">
          <p className="text-sm">Hello! How can I help you today?</p>
        </div>
        <div className="bg-primary text-primary-foreground rounded-md p-3 max-w-[80%] self-end ml-auto">
          <p className="text-sm">I need help writing a report.</p>
        </div>
        <div className="bg-muted rounded-md p-3 max-w-[80%] self-start">
          <p className="text-sm">I'd be happy to help you write a report. What's the topic?</p>
        </div>
      </ConversationContent>
    </Conversation>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <div className="h-64 flex items-center justify-center">
      <ConversationEmptyState />
    </div>
  ),
};

export const WithScrollButton: Story = {
  render: () => (
    <div className="relative h-64 flex items-end justify-center pb-4">
      <ConversationScrollButton />
    </div>
  ),
};
