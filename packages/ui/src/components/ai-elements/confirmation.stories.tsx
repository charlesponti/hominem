import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmationBanner } from './confirmation';

const meta: Meta<typeof ConfirmationBanner> = {
  title: 'AI Elements/Confirmation',
  component: ConfirmationBanner,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ConfirmationBanner>;

export const Info: Story = {
  args: {
    type: 'info',
    title: 'Would you like to proceed?',
    message: 'This will create a new note with the detected content.',
    confirmLabel: 'Create Note',
    cancelLabel: 'Dismiss',
  },
};

export const Warning: Story = {
  args: {
    type: 'warning',
    title: 'Delete this item?',
    message: 'This action cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep',
  },
};

export const Success: Story = {
  args: {
    type: 'success',
    title: 'Note created successfully',
    message: 'Your note has been saved.',
    confirmLabel: 'View Note',
    cancelLabel: 'Dismiss',
  },
};

export const Question: Story = {
  args: {
    type: 'question',
    title: 'Should I also update your calendar?',
    message: 'I noticed a date mentioned. Want me to add an event?',
    confirmLabel: 'Yes, add event',
    cancelLabel: 'No thanks',
  },
};
