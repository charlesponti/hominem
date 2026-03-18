import type { Meta, StoryObj } from '@storybook/react';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription, PopoverTrigger } from './popover';
import { Button } from './button';

const meta: Meta<typeof Popover> = {
  title: 'Overlays/Popover',
  component: Popover,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-4 pt-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="text-sm">Width</label>
            <input className="col-span-2 h-8 rounded border px-2 text-sm" defaultValue="100%" />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="text-sm">Height</label>
            <input className="col-span-2 h-8 rounded border px-2 text-sm" defaultValue="25px" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
