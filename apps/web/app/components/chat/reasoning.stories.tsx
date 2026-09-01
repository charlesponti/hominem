import type { Meta, StoryObj } from '@storybook/react-vite';

import { Reasoning, ReasoningContent, ReasoningTrigger } from './reasoning';

const meta = {
  title: 'Chat/Primitives/Reasoning',
  component: Reasoning,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Reasoning>;

export default meta;
type Story = StoryObj<typeof meta>;

const reasoningText =
  'I compared the release constraints before answering, weighing the tradeoffs between shipping now and waiting for the next window.';

export const Streaming: Story = {
  render: () => (
    <div className="w-96">
      <Reasoning isStreaming>
        <ReasoningTrigger />
        <ReasoningContent>{reasoningText}</ReasoningContent>
      </Reasoning>
    </div>
  ),
};

export const Finished: Story = {
  render: () => (
    <div className="w-96">
      <Reasoning duration={4} isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>{reasoningText}</ReasoningContent>
      </Reasoning>
    </div>
  ),
};

export const DefaultClosed: Story = {
  render: () => (
    <div className="w-96">
      <Reasoning defaultOpen={false} duration={2} isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>{reasoningText}</ReasoningContent>
      </Reasoning>
    </div>
  ),
};
