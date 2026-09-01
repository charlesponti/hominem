import type { Meta, StoryObj } from '@storybook/react-vite';

import { Shimmer } from './shimmer';

const meta = {
  title: 'Chat/Primitives/Shimmer',
  component: Shimmer,
  parameters: { layout: 'centered' },
  args: { children: 'Thinking...' },
} satisfies Meta<typeof Shimmer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FastDuration: Story = { args: { duration: 0.5 } };
export const AsInlineSpan: Story = { args: { as: 'span', children: 'Working on it' } };
export const WideSpread: Story = { args: { spread: 6, children: 'A longer shimmering message' } };
