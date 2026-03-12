import type { Meta, StoryObj } from '@storybook/react';

import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Enter text…' },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-2 w-72">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-72">
      <Input placeholder="Default" />
      <Input placeholder="Disabled" disabled />
      <Input defaultValue="With value" />
    </div>
  ),
};

export const TextareaStory: Story = {
  name: 'Textarea',
  render: () => (
    <div className="flex flex-col gap-2 w-72">
      <Label htmlFor="notes">Notes</Label>
      <Textarea id="notes" placeholder="Write something…" rows={4} />
    </div>
  ),
};
