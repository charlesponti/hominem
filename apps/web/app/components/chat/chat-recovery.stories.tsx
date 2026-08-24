import type { Meta, StoryObj } from '@storybook/react-vite';

import { ErrorState } from '~/components/error-state';

const meta = {
  title: 'Chat/Chat Recovery',
  component: ErrorState,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoadErrorWithRetry: Story = {
  args: {
    actionLabel: 'Retry loading',
    message: 'We could not load this conversation. Check your connection and try again.',
    onAction: () => undefined,
    title: 'Unable to load conversation',
  },
};

export const MissingConversation: Story = {
  args: {
    actionLabel: 'Start a new chat',
    message: 'This conversation no longer exists or you do not have access to it.',
    onAction: () => undefined,
    title: 'Conversation unavailable',
  },
};

export const RegenerationFailure: Story = {
  args: {
    actionLabel: 'Try again',
    message: 'The response could not be regenerated. The existing answer is still available.',
    onAction: () => undefined,
    title: 'Regeneration failed',
  },
};
