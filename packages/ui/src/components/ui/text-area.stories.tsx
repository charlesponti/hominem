import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';

import { TextArea } from './text-area';

const meta: Meta<typeof TextArea> = {
  title: 'UI/TextArea',
  component: TextArea,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
  args: {
    label: 'Notes',
    placeholder: 'Write something...',
    rows: 5,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Notes');

    await userEvent.click(input);
    await userEvent.type(input, 'Ship Storybook coverage');

    await expect(input).toHaveFocus();
    await expect(input).toHaveValue('Ship Storybook coverage');
  },
};

export const WithHelpText: Story = {
  args: {
    label: 'Description',
    helpText: 'Keep it short and concrete.',
    rows: 4,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Keep it short and concrete.')).toBeInTheDocument();
  },
};

export const Error: Story = {
  args: {
    label: 'Bio',
    error: 'Bio is required',
    rows: 4,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Bio');

    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('Bio is required')).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Summary',
    rows: 3,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('Summary')).toBeDisabled();
  },
};
