import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button } from './button';
import { Form } from './form';
import { TextField } from './text-field';

const meta: Meta<typeof Form> = {
  title: 'Forms/Form',
  component: Form,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Form>;

export const Default: Story = {
  args: {
    onSubmit: fn(),
  },
  render: (args) => (
    <Form
      className="w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        args.onSubmit?.(event);
      }}
    >
      <TextField label="Email" type="email" placeholder="you@example.com" />
      <TextField label="Password" type="password" />
      <Button type="submit" variant="primary">
        Continue
      </Button>
    </Form>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'you@example.com');
    await userEvent.type(canvas.getByLabelText('Password'), 'hunter2');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));

    await expect(args.onSubmit).toHaveBeenCalled();
  },
};
