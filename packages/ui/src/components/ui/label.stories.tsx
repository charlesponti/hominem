import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';

const meta: Meta<typeof Label> = {
  title: 'Primitives/Label',
  component: Label,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: {
    children: 'Email address',
  },
};

export const WithHtmlFor: Story = {
  render: () => (
    <div className="flex flex-col gap-1">
      <Label htmlFor="email">Email address</Label>
      <input id="email" type="email" className="h-9 rounded-md border px-3 text-sm max-w-xs" />
    </div>
  ),
};
