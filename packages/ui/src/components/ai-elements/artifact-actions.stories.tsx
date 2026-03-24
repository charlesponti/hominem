import type { Meta, StoryObj } from '@storybook/react';

import { ArtifactActions } from './artifact-actions';

const meta: Meta<typeof ArtifactActions> = {
  title: 'AI Elements/ArtifactActions',
  component: ArtifactActions,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="border border-border max-w-xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ArtifactActions>;

export const Idle: Story = {
  args: { state: 'idle', messageCount: 5, onTransform: () => {} },
};

export const Composing: Story = {
  args: { state: 'composing', messageCount: 3, onTransform: () => {} },
};

export const Classifying: Story = {
  args: { state: 'classifying', messageCount: 8, onTransform: () => {} },
};

export const Persisting: Story = {
  args: { state: 'persisting', messageCount: 8, onTransform: () => {} },
};

export const NoMessages: Story = {
  args: { state: 'idle', messageCount: 0, onTransform: () => {} },
};
