import type { Meta, StoryObj } from '@storybook/react';
import { Tool, ToolInput, ToolOutput } from './tool';

const meta: Meta<typeof Tool> = {
  title: 'AI Elements/Tool',
  component: Tool,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Tool>;

export const Completed: Story = {
  render: () => (
    <Tool name="search_web" status="completed" className="max-w-sm">
      <ToolInput>{`{ "query": "React hooks tutorial" }`}</ToolInput>
      <ToolOutput>{`Found 12 relevant results.`}</ToolOutput>
    </Tool>
  ),
};

export const Running: Story = {
  render: () => (
    <Tool name="read_file" status="running" className="max-w-sm">
      <ToolInput>{`{ "path": "/src/components/button.tsx" }`}</ToolInput>
    </Tool>
  ),
};

export const Error: Story = {
  render: () => (
    <Tool name="write_file" status="error" className="max-w-sm">
      <ToolInput>{`{ "path": "/output.txt", "content": "Hello" }`}</ToolInput>
      <ToolOutput isError>{`Error: Permission denied`}</ToolOutput>
    </Tool>
  ),
};

export const Pending: Story = {
  render: () => (
    <Tool name="execute_code" status="pending" className="max-w-sm">
      <ToolInput>{`{ "language": "python", "code": "print('Hello')" }`}</ToolInput>
    </Tool>
  ),
};
