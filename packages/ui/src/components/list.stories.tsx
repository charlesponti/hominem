import type { Meta, StoryObj } from '@storybook/react-vite';

import { List } from './list';

const meta: Meta<typeof List> = {
  title: 'Patterns/DataDisplay/List',
  component: List,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof List>;

export const Default: Story = {
  render: () => (
    <List className="max-w-sm">
      <li className="px-4 py-3 text-sm">Item one</li>
      <li className="px-4 py-3 text-sm">Item two</li>
      <li className="px-4 py-3 text-sm">Item three</li>
    </List>
  ),
};

export const Loading: Story = {
  render: () => (
    <List isLoading className="max-w-sm">
      <li className="px-4 py-3 text-sm">This won't show</li>
    </List>
  ),
};

export const Empty: Story = {
  render: () => <List className="max-w-sm" />,
};

export const WithContent: Story = {
  render: () => (
    <List className="max-w-sm">
      {['Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown'].map((name) => (
        <li key={name} className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {name[0]}
            </div>
            <span className="text-sm">{name}</span>
          </div>
        </li>
      ))}
    </List>
  ),
};
