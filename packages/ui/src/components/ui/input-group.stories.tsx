import type { Meta, StoryObj } from '@storybook/react';
import { Search } from 'lucide-react';

import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group';

const meta: Meta<typeof InputGroup> = {
  title: 'Forms/InputGroup',
  component: InputGroup,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof InputGroup>;

export const Default: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupInput placeholder="Enter text..." />
    </InputGroup>
  ),
};

export const WithLeadingAddon: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon align="inline-start">
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
    </InputGroup>
  ),
};

export const WithTrailingAddon: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupInput placeholder="Amount" />
      <InputGroupAddon align="inline-end">USD</InputGroupAddon>
    </InputGroup>
  ),
};

export const WithBothAddons: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon align="inline-start">$</InputGroupAddon>
      <InputGroupInput placeholder="0.00" />
      <InputGroupAddon align="inline-end">USD</InputGroupAddon>
    </InputGroup>
  ),
};
