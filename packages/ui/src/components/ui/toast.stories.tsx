import type { Meta, StoryObj } from '@storybook/react';

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';

const meta: Meta<typeof Toast> = {
  title: 'Feedback/Toast',
  component: Toast,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
        <ToastViewport />
      </ToastProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  render: () => (
    <Toast open>
      <div className="grid gap-1">
        <ToastTitle>Scheduled: Catch up</ToastTitle>
        <ToastDescription>Friday, February 10, 2023 at 5:57 PM</ToastDescription>
      </div>
      <ToastAction altText="Undo action">Undo</ToastAction>
      <ToastClose />
    </Toast>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Toast open variant="destructive">
      <div className="grid gap-1">
        <ToastTitle>Uh oh! Something went wrong.</ToastTitle>
        <ToastDescription>There was a problem with your request.</ToastDescription>
      </div>
      <ToastAction altText="Try again">Try again</ToastAction>
      <ToastClose />
    </Toast>
  ),
};

export const Simple: Story = {
  render: () => (
    <Toast open>
      <div className="grid gap-1">
        <ToastTitle>Your message has been sent.</ToastTitle>
      </div>
      <ToastClose />
    </Toast>
  ),
};
