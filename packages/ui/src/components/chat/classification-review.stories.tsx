import type { Meta, StoryObj } from '@storybook/react';

import { ClassificationReview } from './classification-review';

const meta = {
  title: 'Chat/ClassificationReview',
  component: ClassificationReview,
  tags: ['autodocs'],
} satisfies Meta<typeof ClassificationReview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    proposedType: 'note',
    proposedTitle: 'Meeting Notes - Q1 Planning',
    proposedChanges: [
      'Added 3 action items',
      'Updated timeline with new milestones',
      'Included stakeholder feedback',
    ],
    previewContent: `## Meeting Summary

- Discussed Q1 roadmap
- Assigned action items to team leads
- Set timeline for deliverables

## Action Items
1. Complete feature specification by Feb 15
2. Schedule stakeholder review by Feb 20
3. Finalize resource allocation by Feb 25`,
    onAccept: () => console.log('Accept'),
    onReject: () => console.log('Reject'),
  },
};

export const NoChanges: Story = {
  args: {
    proposedType: 'note',
    proposedTitle: 'Quick Note',
    proposedChanges: [],
    previewContent: 'Just a simple note with no significant changes.',
    onAccept: () => console.log('Accept'),
    onReject: () => console.log('Reject'),
  },
};

export const LongPreview: Story = {
  args: {
    proposedType: 'task',
    proposedTitle: 'Q1 Roadmap Tasks',
    proposedChanges: ['Created 12 new tasks', 'Set dependencies between tasks'],
    previewContent: `Task 1: Design System Updates
- Create color tokens
- Update typography scale
- Document component patterns

Task 2: API Integration
- Connect to new endpoints
- Handle error states
- Add loading indicators

Task 3: Testing Suite
- Write unit tests
- Add integration tests
- Set up CI pipeline

... (and 9 more tasks)`,
    onAccept: () => console.log('Accept'),
    onReject: () => console.log('Reject'),
  },
};
