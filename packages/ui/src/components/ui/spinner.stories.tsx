import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Feedback/Spinner',
  component: Spinner,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Large: Story = {
  render: () => <Spinner className="size-8" />,
};

export const WithText: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner />
      <span>Loading...</span>
    </div>
  ),
};
