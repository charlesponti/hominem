import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChatMessageSearch } from './chat-message-search';

const meta = {
  title: 'Chat/Message Search',
  component: ChatMessageSearch,
  parameters: { layout: 'centered' },
  args: { onChange: () => undefined, onClose: () => undefined },
} satisfies Meta<typeof ChatMessageSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { error: null, query: '' },
};

export const Searching: Story = {
  args: { error: null, query: 'release' },
};

export const NoResults: Story = {
  args: { error: null, query: 'missing' },
};

export const SearchError: Story = {
  args: {
    error: new Error('Search is unavailable. Try again.'),
    query: 'release',
  },
};
