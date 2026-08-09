import { describe, expect, it } from 'vitest';

import { buildTaskListProposal } from '~/hooks/use-chat-transform';

describe('buildTaskListProposal', () => {
  it('uses the no-tasks copy when extraction finds nothing', () => {
    const proposal = buildTaskListProposal('transcript', []);

    expect(proposal).toEqual({
      proposedType: 'task_list',
      proposedTitle: 'No tasks found',
      proposedChanges: ['No actionable tasks found in this conversation.'],
      previewContent: 'transcript',
      items: [],
    });
  });

  it('uses the single task title when exactly one task is found', () => {
    const proposal = buildTaskListProposal('transcript', [{ title: 'Write docs' }]);

    expect(proposal.proposedTitle).toBe('Write docs');
    expect(proposal.proposedChanges).toEqual(['Write docs']);
    expect(proposal.items).toEqual([{ title: 'Write docs' }]);
  });

  it('uses the plural count title when multiple tasks are found', () => {
    const proposal = buildTaskListProposal('transcript', [{ title: 'A' }, { title: 'B' }]);

    expect(proposal.proposedTitle).toBe('2 tasks');
    expect(proposal.proposedChanges).toEqual(['A', 'B']);
  });
});
