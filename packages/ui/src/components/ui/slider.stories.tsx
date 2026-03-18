import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './slider';

const meta: Meta<typeof Slider> = {
  title: 'Forms/Slider',
  component: Slider,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  render: () => (
    <Slider defaultValue={[50]} max={100} step={1} className="w-64" />
  ),
};

export const Range: Story = {
  render: () => (
    <Slider defaultValue={[25, 75]} max={100} step={1} className="w-64" />
  ),
};

export const WithSteps: Story = {
  render: () => (
    <Slider defaultValue={[50]} max={100} step={10} className="w-64" />
  ),
};

export const Disabled: Story = {
  render: () => (
    <Slider defaultValue={[40]} max={100} step={1} disabled className="w-64" />
  ),
};
