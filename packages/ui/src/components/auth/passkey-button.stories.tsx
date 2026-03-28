import type { Meta, StoryObj } from '@storybook/react-vite';

import { PasskeyButton } from './passkey-button';

const meta: Meta<typeof PasskeyButton> = {
  title: 'Patterns/Auth/PasskeyButton',
  component: PasskeyButton,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof PasskeyButton>;

export const Default: Story = {
  args: {
    onClick: () => {},
  },
};

export const Loading: Story = {
  args: {
    onClick: () => {},
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    onClick: () => {},
    disabled: true,
  },
};
