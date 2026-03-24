import type { Meta, StoryObj } from '@storybook/react';

import { AuthErrorBanner } from './auth-error-banner';

const meta: Meta<typeof AuthErrorBanner> = {
  title: 'Auth/AuthErrorBanner',
  component: AuthErrorBanner,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AuthErrorBanner>;

export const Default: Story = {
  args: {
    error: 'Invalid email or password',
  },
};

export const SessionExpired: Story = {
  args: {
    error: 'Your session has expired. Please sign in again.',
  },
};

export const NoError: Story = {
  args: {
    error: null,
  },
};
