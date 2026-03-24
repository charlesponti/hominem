import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

const meta: Meta<typeof Sheet> = {
  title: 'Overlays/Sheet',
  component: Sheet,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm">Name</label>
            <input
              defaultValue="Pedro Duarte"
              className="col-span-3 h-9 rounded-md border px-3 text-sm"
            />
          </div>
        </div>
        <SheetFooter>
          <Button type="submit">Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const Left: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Left Sheet</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div className="py-4 flex flex-col gap-2">
          <Button variant="ghost" className="justify-start">
            Home
          </Button>
          <Button variant="ghost" className="justify-start">
            About
          </Button>
          <Button variant="ghost" className="justify-start">
            Contact
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  ),
};
