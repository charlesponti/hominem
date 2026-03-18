import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { Stack } from '../layout/stack';
import { Text } from './text';

const meta: Meta<typeof Text> = {
  title: 'Typography/Text',
  component: Text,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Text>;

export const Scale: Story = {
  render: () => (
    <Stack gap="lg">
      <Text variant="body-1">Body 1 text for prominent copy.</Text>
      <Text variant="body-2">Body 2 text for standard content.</Text>
      <Text variant="body-3">Body 3 text for labels and dense UI.</Text>
      <Text variant="body-4">Body 4 text for captions and helper content.</Text>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Body 1 text for prominent copy.')).toBeInTheDocument();
    await expect(
      canvas.getByText('Body 4 text for captions and helper content.'),
    ).toBeInTheDocument();
  },
};

export const Muted: Story = {
  render: () => <Text muted>Muted helper text.</Text>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Muted helper text.')).toBeInTheDocument();
  },
};
