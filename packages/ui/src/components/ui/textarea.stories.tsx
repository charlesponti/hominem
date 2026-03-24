import type { Meta, StoryObj } from '@storybook/react';

import { Textarea } from './textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Forms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message here.',
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'This is some pre-filled content in the textarea.',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Cannot edit this.',
    disabled: true,
  },
};

export const Invalid: Story = {
  args: {
    placeholder: 'Invalid state',
    'aria-invalid': true,
  },
};
