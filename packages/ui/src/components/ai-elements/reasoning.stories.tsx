import type { Meta, StoryObj } from '@storybook/react-vite';

import { Reasoning, ReasoningContent } from './reasoning';

const meta: Meta<typeof Reasoning> = {
  title: 'Patterns/AI/Reasoning',
  component: Reasoning,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Reasoning>;

export const Collapsed: Story = {
  render: () => (
    <Reasoning className="max-w-md">
      The user is asking about component architecture. I should consider their level of expertise
      and provide a clear, structured explanation with examples.
    </Reasoning>
  ),
};

export const Open: Story = {
  render: () => (
    <Reasoning isOpen className="max-w-md">
      The user is asking about component architecture. I should consider their level of expertise
      and provide a clear, structured explanation with examples. Let me think about this step by
      step: 1. First, understand the user's current knowledge level 2. Choose appropriate
      terminology 3. Provide practical examples
    </Reasoning>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <ReasoningContent className="max-w-md text-sm text-muted-foreground p-4 bg-muted rounded-md">
      Analyzing the request... The user wants to understand Storybook story patterns. I'll focus on
      practical, copy-paste examples.
    </ReasoningContent>
  ),
};
