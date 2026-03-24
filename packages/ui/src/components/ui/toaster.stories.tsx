import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { Toaster } from './toaster';
import { useToast } from './use-toast';

const meta: Meta<typeof Toaster> = {
  title: 'Feedback/Toaster',
  component: Toaster,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Toaster>;

function ToasterDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        onClick={() => toast({ title: 'Scheduled: Catch up', description: 'Friday at 5:57 PM' })}
      >
        Show Toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' })
        }
      >
        Show Destructive Toast
      </Button>
      <Toaster />
    </div>
  );
}

export const Default: Story = {
  render: () => <ToasterDemo />,
};
