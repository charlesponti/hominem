import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Stack } from './stack';

const meta: Meta<typeof Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Stack>;

export const Default: Story = {
  render: () => (
    <Stack gap="md" className="w-80">
      <div className="border p-3">First item</div>
      <div className="border p-3">Second item</div>
      <div className="border p-3">Third item</div>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('First item')).toBeInTheDocument();
    await expect(canvas.getByText('Second item')).toBeInTheDocument();
    await expect(canvas.getByText('Third item')).toBeInTheDocument();
  },
};

export const WithDividers: Story = {
  render: () => (
    <Stack gap="sm" divider={<div className="border-t border-border" />} className="w-80">
      <div className="py-2">Profile</div>
      <div className="py-2">Security</div>
      <div className="py-2">Notifications</div>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Profile')).toBeInTheDocument();
    await expect(canvas.getByText('Security')).toBeInTheDocument();
    await expect(canvas.getByText('Notifications')).toBeInTheDocument();
  },
};
