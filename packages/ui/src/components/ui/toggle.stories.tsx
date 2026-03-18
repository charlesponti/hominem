import type { Meta, StoryObj } from '@storybook/react';
import { Bold, Italic, Underline } from 'lucide-react';
import { Toggle } from './toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Forms/Toggle',
  component: Toggle,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
  render: () => (
    <Toggle aria-label="Toggle bold">
      <Bold className="size-4" />
    </Toggle>
  ),
};

export const WithText: Story = {
  render: () => (
    <Toggle aria-label="Toggle italic">
      <Italic className="size-4 mr-2" />
      Italic
    </Toggle>
  ),
};

export const Outline: Story = {
  render: () => (
    <Toggle variant="outline" aria-label="Toggle underline">
      <Underline className="size-4" />
    </Toggle>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle size="sm" aria-label="Small">
        <Bold className="size-3" />
      </Toggle>
      <Toggle size="default" aria-label="Default">
        <Bold className="size-4" />
      </Toggle>
      <Toggle size="lg" aria-label="Large">
        <Bold className="size-5" />
      </Toggle>
    </div>
  ),
};

export const Pressed: Story = {
  render: () => (
    <Toggle defaultPressed aria-label="Bold">
      <Bold className="size-4" />
    </Toggle>
  ),
};
