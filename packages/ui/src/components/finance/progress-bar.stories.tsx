import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProgressBar } from './progress-bar';

const meta: Meta<typeof ProgressBar> = {
  title: 'Patterns/Finance/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  args: {
    progress: 45,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Complete: Story = {
  args: {
    progress: 100,
  },
};

export const Stages: Story = {
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-4">
      <ProgressBar progress={10} />
      <ProgressBar progress={45} />
      <ProgressBar progress={80} />
    </div>
  ),
};
