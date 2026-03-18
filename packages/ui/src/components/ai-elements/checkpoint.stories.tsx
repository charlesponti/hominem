import type { Meta, StoryObj } from '@storybook/react';
import { Checkpoint, CheckpointList, CheckpointProgress } from './checkpoint';

const meta: Meta<typeof Checkpoint> = {
  title: 'AI Elements/Checkpoint',
  component: Checkpoint,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Checkpoint>;

export const Default: Story = {
  args: {
    title: 'Analyze requirements',
    description: 'Reading and understanding the task requirements.',
    status: 'pending',
  },
};

export const Statuses: Story = {
  render: () => (
    <CheckpointList>
      <Checkpoint title="Plan approach" status="completed" description="Analyzed requirements." />
      <Checkpoint title="Write code" status="in-progress" description="Currently implementing..." isActive />
      <Checkpoint title="Run tests" status="pending" description="Waiting to run." />
      <Checkpoint title="Deploy" status="error" description="Failed at previous step." />
    </CheckpointList>
  ),
};

export const WithProgress: Story = {
  render: () => (
    <div className="w-64 space-y-4">
      <CheckpointProgress current={2} total={5} label="Steps completed" />
    </div>
  ),
};
