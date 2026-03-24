import type { Meta, StoryObj } from '@storybook/react';
import { Paperclip } from 'lucide-react';

import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from './prompt-input';

const meta: Meta<typeof PromptInput> = {
  title: 'AI Elements/PromptInput',
  component: PromptInput,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof PromptInput>;

export const Default: Story = {
  render: () => (
    <PromptInput className="max-w-lg border rounded-md p-2">
      <PromptInputBody>
        <PromptInputTextarea placeholder="Type your message..." />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputButton tooltip="Attach file">
            <Paperclip className="size-4" />
          </PromptInputButton>
        </PromptInputTools>
        <PromptInputSubmit status="ready" />
      </PromptInputFooter>
    </PromptInput>
  ),
};

export const Streaming: Story = {
  render: () => (
    <PromptInput className="max-w-lg border rounded-md p-2">
      <PromptInputBody>
        <PromptInputTextarea placeholder="Type your message..." disabled />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools />
        <PromptInputSubmit status="streaming" />
      </PromptInputFooter>
    </PromptInput>
  ),
};
