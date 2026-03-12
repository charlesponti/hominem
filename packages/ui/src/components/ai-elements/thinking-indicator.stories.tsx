import type { Meta, StoryObj } from '@storybook/react';

import { ThinkingIndicator } from './thinking-indicator';

const meta: Meta<typeof ThinkingIndicator> = {
  title: 'AI Elements/ThinkingIndicator',
  component: ThinkingIndicator,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ThinkingIndicator>;

export const Default: Story = {};
