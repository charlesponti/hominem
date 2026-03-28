import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { TagSelect, type TagOption } from './tag-select';

const tags: TagOption[] = [
  { id: 'groceries', name: 'Groceries' },
  { id: 'travel', name: 'Travel' },
  { id: 'software', name: 'Software' },
];

const meta: Meta<typeof TagSelect> = {
  title: 'Patterns/Finance/TagSelect',
  component: TagSelect,
  tags: ['autodocs'],
  args: {
    selectedTag: 'all',
    tags,
    isLoading: false,
    placeholder: 'All tags',
    label: 'Tag',
  },
  render: (args) => {
    const [selectedTag, setSelectedTag] = useState(args.selectedTag);

    return <TagSelect {...args} selectedTag={selectedTag} onTagChange={setSelectedTag} />;
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    tags: [],
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    tags: [],
  },
};
