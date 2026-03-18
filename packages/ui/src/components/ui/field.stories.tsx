import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { Field } from './field';
import { Input } from './input';
import { Textarea } from './textarea';

const meta: Meta<typeof Field> = {
  title: 'Forms/Field',
  component: Field,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
  render: () => (
    <Field label="Email" helpText="We will never share your address.">
      <Input placeholder="you@example.com" />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Email');

    await userEvent.type(input, 'you@example.com');

    await expect(input).toHaveValue('you@example.com');
    await expect(canvas.getByText('We will never share your address.')).toBeInTheDocument();
  },
};

export const Error: Story = {
  render: () => (
    <Field label="Email" error="Email is required">
      <Input placeholder="you@example.com" />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByRole('alert')).toHaveTextContent('Email is required');
  },
};

export const TextareaField: Story = {
  render: () => (
    <Field label="Notes" helpText="Markdown supported">
      <Textarea rows={5} placeholder="Write something..." />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('Notes')).toBeInTheDocument();
    await expect(canvas.getByText('Markdown supported')).toBeInTheDocument();
  },
};
