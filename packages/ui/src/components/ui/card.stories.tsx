import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

const meta: Meta = {
  title: 'Data Display/Card',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>A short description of the card's content.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="body-2 text-text-secondary">
          Card body content goes here. It can be any React node.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm">
          Cancel
        </Button>
        <Button size="sm">Confirm</Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cancelButton = canvas.getByRole('button', { name: 'Cancel' });

    await userEvent.tab();

    await expect(canvas.getByText('Card Title')).toBeInTheDocument();
    await expect(cancelButton).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  },
};

export const Minimal: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent className="pt-6">
        <p className="body-2 text-text-secondary">Minimal card with only content.</p>
      </CardContent>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Minimal card with only content.')).toBeInTheDocument();
  },
};
