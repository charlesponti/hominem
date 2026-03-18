import type { Meta, StoryObj } from '@storybook/react';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from './button-group';
import { Button } from './button';

const meta: Meta<typeof ButtonGroup> = {
  title: 'Primitives/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ButtonGroup>;

export const Default: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Left</Button>
      <Button variant="outline">Middle</Button>
      <Button variant="outline">Right</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">Top</Button>
      <Button variant="outline">Middle</Button>
      <Button variant="outline">Bottom</Button>
    </ButtonGroup>
  ),
};

export const WithText: Story = {
  render: () => (
    <ButtonGroup>
      <ButtonGroupText>$</ButtonGroupText>
      <Button variant="outline">Action</Button>
    </ButtonGroup>
  ),
};

export const WithSeparator: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Left</Button>
      <ButtonGroupSeparator />
      <Button variant="outline">Right</Button>
    </ButtonGroup>
  ),
};
