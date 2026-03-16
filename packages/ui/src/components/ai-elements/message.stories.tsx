import type { Meta, StoryObj } from '@storybook/react';

import {
  Message,
  MessageAnnotations,
  MessageContent,
  MessageResponse,
  MessageSurface,
} from './message';

const meta: Meta = {
  title: 'AI Elements/Message',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const UserMessage: Story = {
  render: () => (
    <Message from="user">
      <MessageContent align="end" width="bubble">
        <MessageSurface tone="user">
          <MessageResponse className="text-primary-foreground">
            How do I create a new note?
          </MessageResponse>
        </MessageSurface>
        <MessageAnnotations>You</MessageAnnotations>
      </MessageContent>
    </Message>
  ),
};

export const AssistantMessage: Story = {
  render: () => (
    <Message from="assistant">
      <MessageContent width="transcript">
        <MessageResponse>
          To create a new note, click the "New Note" button in the top right corner of the notes
          list. You can also use the keyboard shortcut ⌘N.
        </MessageResponse>
        <MessageAnnotations>AI Assistant</MessageAnnotations>
      </MessageContent>
    </Message>
  ),
};

export const Conversation: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Message from="user">
        <MessageContent align="end" width="bubble">
          <MessageSurface tone="user">
            <MessageResponse className="text-primary-foreground">
              What's the weather like today?
            </MessageResponse>
          </MessageSurface>
          <MessageAnnotations>You</MessageAnnotations>
        </MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent width="transcript">
          <MessageResponse>
            I don't have access to real-time weather data, but I can help you find a weather
            service. Would you like me to suggest some options?
          </MessageResponse>
          <MessageAnnotations>AI Assistant</MessageAnnotations>
        </MessageContent>
      </Message>
    </div>
  ),
};
