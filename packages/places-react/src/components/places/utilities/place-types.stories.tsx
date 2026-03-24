import type { Meta, StoryObj } from '@storybook/react';

import { PlaceTypes } from './place-types';

const meta: Meta<typeof PlaceTypes> = {
  title: 'Places/PlaceTypes',
  component: PlaceTypes,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof PlaceTypes>;

export const Default: Story = {
  args: {
    types: ['restaurant', 'cafe', 'bar'],
  },
};

export const ManyTypes: Story = {
  args: {
    types: ['restaurant', 'bar', 'night_club', 'food', 'point_of_interest'],
    limit: 3,
  },
};

export const Limited: Story = {
  args: {
    types: ['gym', 'spa', 'health'],
    limit: 2,
  },
};

export const SingleType: Story = {
  args: {
    types: ['library'],
  },
};
