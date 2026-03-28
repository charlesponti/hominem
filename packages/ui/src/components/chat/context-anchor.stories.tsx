import type { Meta, StoryObj } from '@storybook/react-vite';

import { mockSessionSources } from './chat-story-data';
import { ContextAnchor } from './context-anchor';

const meta = {
  title: 'Patterns/Chat/ContextAnchor',
  component: ContextAnchor,
  tags: ['autodocs'],
} satisfies Meta<typeof ContextAnchor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewSession: Story = {
  args: { source: mockSessionSources.new },
};

export const FromThought: Story = {
  args: { source: mockSessionSources.thought },
};

export const FromNote: Story = {
  args: { source: mockSessionSources.note },
};
