import type { Meta, StoryObj } from '@storybook/react';

import {
  CitationMarker,
  Context,
  ContextContent,
  ContextHeader,
  ContextItem,
  InlineCitation,
} from './context';

const meta: Meta<typeof Context> = {
  title: 'AI Elements/Context',
  component: Context,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Context>;

export const Default: Story = {
  render: () => (
    <Context className="max-w-sm">
      <ContextHeader title="Context" count={2} />
      <ContextContent>
        <ContextItem>
          <p className="text-sm font-medium">Meeting Notes — March 2024</p>
          <p className="text-xs text-muted-foreground mt-1">
            Discussed Q1 planning and team capacity.
          </p>
        </ContextItem>
        <ContextItem>
          <p className="text-sm font-medium">Project Brief</p>
          <p className="text-xs text-muted-foreground mt-1">
            Overview of the new product feature requirements.
          </p>
        </ContextItem>
      </ContextContent>
    </Context>
  ),
};

export const Citations: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <p className="text-sm">
        The framework was released in 2020
        <InlineCitation index={1} />. It has since gained widespread adoption
        <InlineCitation index={2} />.
      </p>
      <div className="flex gap-2 items-center">
        <CitationMarker index={1} />
        <span className="text-sm text-muted-foreground">Release announcement post</span>
      </div>
      <div className="flex gap-2 items-center">
        <CitationMarker index={2} />
        <span className="text-sm text-muted-foreground">State of JS survey 2023</span>
      </div>
    </div>
  ),
};
