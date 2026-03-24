import type { Meta, StoryObj } from '@storybook/react';

import { AuthLoadingState } from './auth-loading-state';

const meta: Meta<typeof AuthLoadingState> = {
  title: 'Auth/AuthLoadingState',
  component: AuthLoadingState,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AuthLoadingState>;

export const Default: Story = {
  args: {
    message: 'Loading...',
  },
};

export const Verifying: Story = {
  args: {
    message: 'Verifying your credentials...',
  },
};

export const SigningIn: Story = {
  args: {
    message: 'Signing you in...',
  },
};
