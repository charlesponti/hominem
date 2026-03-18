import type { Meta, StoryObj } from '@storybook/react';
import { Loading, LoadingScreen } from './loading';

const meta: Meta<typeof Loading> = {
  title: 'Feedback/Loading',
  component: Loading,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Loading>;

export const Default: Story = {
  args: {
    size: 'md',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Loading size="sm" />
      <Loading size="md" />
      <Loading size="lg" />
      <Loading size="xl" />
      <Loading size="2xl" />
      <Loading size="3xl" />
    </div>
  ),
};

export const Screen: Story = {
  render: () => <LoadingScreen />,
};
