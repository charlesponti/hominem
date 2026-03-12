import type { Meta, StoryObj } from '@storybook/react';

import { ShimmerMessage } from './shimmer';

const meta: Meta<typeof ShimmerMessage> = {
  title: 'AI Elements/ShimmerMessage',
  component: ShimmerMessage,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ShimmerMessage>;

export const Default: Story = {};

export const Stacked: Story = {
  render: () => (
    <div className="flex flex-col">
      <ShimmerMessage />
      <ShimmerMessage />
      <ShimmerMessage />
    </div>
  ),
};
