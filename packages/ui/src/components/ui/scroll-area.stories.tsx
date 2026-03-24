import type { Meta, StoryObj } from '@storybook/react';

import { ScrollArea } from './scroll-area';
import { Separator } from './separator';

const tags = Array.from({ length: 50 }).map((_, i, a) => `v1.2.${a.length - i}`);

const meta: Meta<typeof ScrollArea> = {
  title: 'Data Display/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {tags.map((tag) => (
          <>
            <div key={tag} className="text-sm">
              {tag}
            </div>
            <Separator className="my-2" />
          </>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-[100px] shrink-0 rounded-md bg-muted p-4 text-center text-sm">
            Item {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
