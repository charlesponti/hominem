import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tool, ToolApprovalActions, ToolContent, ToolHeader, ToolInput, ToolPreview } from './tool';

const meta = {
  title: 'Chat/Primitives/Tool',
  component: Tool,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Tool>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  render: () => (
    <div className="w-96">
      <Tool defaultOpen>
        <ToolHeader status="pending" toolName="delete_note" />
        <ToolContent>
          <ToolPreview preview={{ title: 'Draft note', wordCount: 240 }} />
          <ToolApprovalActions onApprove={() => undefined} onReject={() => undefined} />
        </ToolContent>
      </Tool>
    </div>
  ),
};

export const Completed: Story = {
  render: () => (
    <div className="w-96">
      <Tool defaultOpen>
        <ToolHeader status="completed" toolName="search_notes" />
        <ToolContent>
          <ToolInput input={{ query: 'quarterly planning' }} />
        </ToolContent>
      </Tool>
    </div>
  ),
};

export const Rejected: Story = {
  render: () => (
    <div className="w-96">
      <Tool defaultOpen>
        <ToolHeader status="rejected" toolName="delete_note" />
        <ToolContent>
          <ToolPreview preview={{ title: 'Draft note' }} />
        </ToolContent>
      </Tool>
    </div>
  ),
};

export const Failed: Story = {
  render: () => (
    <div className="w-96">
      <Tool defaultOpen>
        <ToolHeader status="failed" toolName="send_email" />
        <ToolContent>
          <ToolInput input={{ to: 'someone@example.com' }} />
        </ToolContent>
      </Tool>
    </div>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <div className="w-96">
      <Tool>
        <ToolHeader status="completed" toolName="search_notes" />
        <ToolContent>
          <ToolInput input={{ query: 'quarterly planning' }} />
        </ToolContent>
      </Tool>
    </div>
  ),
};
