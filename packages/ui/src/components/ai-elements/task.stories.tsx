import type { Meta, StoryObj } from '@storybook/react-vite';

import { Task, TaskList, TaskStatusBadge } from './task';

const meta: Meta<typeof Task> = {
  title: 'AI Elements/Task',
  component: Task,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Task>;

export const Default: Story = {
  args: {
    title: 'Review pull request',
    description: 'Check the new authentication flow changes.',
    status: 'pending',
    priority: 'high',
    dueDate: 'Mar 20, 2026',
  },
};

export const Completed: Story = {
  args: {
    title: 'Write unit tests',
    description: 'Add coverage for the new components.',
    status: 'completed',
    priority: 'medium',
  },
};

export const TaskListStory: Story = {
  render: () => (
    <TaskList>
      <Task title="Design mockups" status="completed" priority="low" />
      <Task
        title="Implement features"
        status="in-progress"
        priority="high"
        dueDate="Mar 25, 2026"
      />
      <Task
        title="Write docs"
        status="pending"
        priority="medium"
        description="Document all new APIs."
      />
      <Task title="Deploy" status="pending" priority="high" dueDate="Apr 1, 2026" />
    </TaskList>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TaskStatusBadge status="pending" />
      <TaskStatusBadge status="in-progress" />
      <TaskStatusBadge status="completed" />
      <TaskStatusBadge status="cancelled" />
    </div>
  ),
};
