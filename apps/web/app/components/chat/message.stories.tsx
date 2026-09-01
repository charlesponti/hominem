import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyIcon } from 'lucide-react';

import {
  Message,
  MessageAction,
  MessageActions,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageContent,
  MessageResponse,
} from './message';

const meta = {
  title: 'Chat/Primitives/Message',
  component: Message,
  parameters: { layout: 'centered' },
  args: { from: 'assistant' },
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Assistant: Story = {
  render: () => (
    <div className="w-96">
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>Here is the answer to your question.</MessageResponse>
        </MessageContent>
      </Message>
    </div>
  ),
};

export const User: Story = {
  render: () => (
    <div className="w-96">
      <Message from="user">
        <MessageContent>
          <MessageResponse>Can you help me plan this?</MessageResponse>
        </MessageContent>
      </Message>
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <div className="w-96">
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>A response with actions underneath it.</MessageResponse>
          <MessageActions>
            <MessageAction label="Copy message" tooltip="Copy">
              <CopyIcon size={14} />
            </MessageAction>
          </MessageActions>
        </MessageContent>
      </Message>
    </div>
  ),
};

export const Branches: Story = {
  render: () => (
    <div className="w-96">
      <MessageBranch>
        <MessageBranchContent>
          <Message from="assistant" key="branch-1">
            <MessageContent>
              <MessageResponse>First branch of the response.</MessageResponse>
            </MessageContent>
          </Message>
          <Message from="assistant" key="branch-2">
            <MessageContent>
              <MessageResponse>Second branch of the response.</MessageResponse>
            </MessageContent>
          </Message>
        </MessageBranchContent>
        <MessageBranchSelector>
          <MessageBranchPrevious />
          <MessageBranchPage />
          <MessageBranchNext />
        </MessageBranchSelector>
      </MessageBranch>
    </div>
  ),
};
