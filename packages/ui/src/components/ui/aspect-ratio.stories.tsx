import type { Meta, StoryObj } from '@storybook/react';

import { AspectRatio } from './aspect-ratio';

const meta: Meta<typeof AspectRatio> = {
  title: 'Data Display/AspectRatio',
  component: AspectRatio,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AspectRatio>;

export const SixteenByNine: Story = {
  render: () => (
    <div className="w-[400px]">
      <AspectRatio ratio={16 / 9}>
        <div className="flex items-center justify-center size-full rounded-md bg-muted text-muted-foreground text-sm">
          16 / 9
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Square: Story = {
  render: () => (
    <div className="w-[200px]">
      <AspectRatio ratio={1}>
        <div className="flex items-center justify-center size-full rounded-md bg-muted text-muted-foreground text-sm">
          1 / 1
        </div>
      </AspectRatio>
    </div>
  ),
};

export const FourByThree: Story = {
  render: () => (
    <div className="w-[400px]">
      <AspectRatio ratio={4 / 3}>
        <div className="flex items-center justify-center size-full rounded-md bg-muted text-muted-foreground text-sm">
          4 / 3
        </div>
      </AspectRatio>
    </div>
  ),
};
