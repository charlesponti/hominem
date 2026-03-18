import type { Meta, StoryObj } from '@storybook/react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';

const meta: Meta<typeof ToggleGroup> = {
  title: 'Forms/ToggleGroup',
  component: ToggleGroup,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ToggleGroup>;

export const Default: Story = {
  render: () => (
    <ToggleGroup type="multiple">
      <ToggleGroupItem value="bold" aria-label="Bold">
        <Bold className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <Italic className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <Underline className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Single: Story = {
  render: () => (
    <ToggleGroup type="single" defaultValue="center">
      <ToggleGroupItem value="left" aria-label="Left aligned">
        <AlignLeft className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Center aligned">
        <AlignCenter className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Right aligned">
        <AlignRight className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Outline: Story = {
  render: () => (
    <ToggleGroup type="multiple" variant="outline">
      <ToggleGroupItem value="bold" aria-label="Bold">
        <Bold className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <Italic className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
