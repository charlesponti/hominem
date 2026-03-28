import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProposalCard, ProposalList } from './proposal-card';

const meta: Meta<typeof ProposalCard> = {
  title: 'Patterns/AI/ProposalCard',
  component: ProposalCard,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ProposalCard>;

const noteItem = {
  id: '1',
  sessionId: 'session-1',
  proposedType: 'note' as const,
  proposedTitle: 'Meeting notes from Q3 planning',
  proposedChanges: ['Summarised 12 discussion points', 'Extracted 3 action items'],
  previewContent: '# Q3 Planning\n\nKey decisions made today...',
  createdAt: new Date().toISOString(),
};

export const Note: Story = {
  args: {
    item: noteItem,
    onReview: () => {},
    onReject: () => {},
  },
};

export const Task: Story = {
  args: {
    item: {
      ...noteItem,
      id: '2',
      proposedType: 'task' as const,
      proposedTitle: 'Follow up with design team',
    },
    onReview: () => {},
    onReject: () => {},
  },
};

export const List: StoryObj<typeof ProposalList> = {
  render: () => (
    <ProposalList
      items={[
        noteItem,
        { ...noteItem, id: '2', proposedType: 'task' as const, proposedTitle: 'Send recap email' },
        {
          ...noteItem,
          id: '3',
          proposedType: 'task_list' as const,
          proposedTitle: 'Sprint backlog items',
        },
      ]}
      onReview={() => {}}
      onReject={() => {}}
    />
  ),
};

export const EmptyList: StoryObj<typeof ProposalList> = {
  render: () => <ProposalList items={[]} onReview={() => {}} onReject={() => {}} />,
};
