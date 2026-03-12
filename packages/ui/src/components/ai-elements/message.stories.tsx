import type { Meta, StoryObj } from '@storybook/react';

import { Message, MessageAvatar, MessageContent, MessageResponse } from './message';

const meta: Meta = {
  title: 'AI Elements/Message',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const UserMessage: Story = {
  render: () => (
    <Message from="user">
      <MessageContent>
        <MessageResponse>How do I create a new note?</MessageResponse>
      </MessageContent>
    </Message>
  ),
};

export const AssistantMessage: Story = {
  render: () => (
    <Message from="assistant">
      <MessageAvatar fallback="AI" />
      <MessageContent>
        <MessageResponse>
          To create a new note, click the "New Note" button in the top right corner of the notes
          list. You can also use the keyboard shortcut ⌘N.
        </MessageResponse>
      </MessageContent>
    </Message>
  ),
};

export const Conversation: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Message from="user">
        <MessageContent>
          <MessageResponse>What's the weather like today?</MessageResponse>
        </MessageContent>
      </Message>
      <Message from="assistant">
        <MessageAvatar fallback="AI" />
        <MessageContent>
          <MessageResponse>
            I don't have access to real-time weather data, but I can help you find a weather
            service. Would you like me to suggest some options?
          </MessageResponse>
        </MessageContent>
      </Message>
    </div>
  ),
};
