import type { Meta, StoryObj } from '@storybook/react';

import { TopTags } from './top-tags';

const meta: Meta<typeof TopTags> = {
  title: 'Finance/Analytics/TopTags',
  component: TopTags,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof TopTags>;

export const Default: Story = {
  args: {},
};
