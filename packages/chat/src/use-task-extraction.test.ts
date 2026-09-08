import { describe, expect, it } from 'vitest';

import { buildExtractedTasksProposal, type TaskExtractionStrings } from './use-task-extraction';

const strings: TaskExtractionStrings = {
  noTasksFoundTitle: 'No tasks found',
  noTasksFoundDescription: 'No actionable tasks found in this conversation.',
  tasksFoundTitle: (count: number) => `${count} tasks`,
  prepareReviewErrorTitle: 'Could not prepare review',
  saveContentErrorTitle: 'Could not save content',
  errorMessage: 'Please try again.',
};

describe('buildExtractedTasksProposal', () => {
  it('uses the no-tasks copy when extraction finds nothing', () => {
    expect(buildExtractedTasksProposal('transcript', [], strings)).toEqual({
      proposedType: 'task_list',
      proposedTitle: 'No tasks found',
      proposedChanges: ['No actionable tasks found in this conversation.'],
      previewContent: 'transcript',
      items: [],
    });
  });

  it('uses the single task title when exactly one task is found', () => {
    const proposal = buildExtractedTasksProposal('transcript', [{ title: 'Write docs' }], strings);

    expect(proposal.proposedTitle).toBe('Write docs');
    expect(proposal.proposedChanges).toEqual(['Write docs']);
    expect(proposal.items).toEqual([{ id: 'task-proposal-0', title: 'Write docs' }]);
  });

  it('uses the plural count title when multiple tasks are found', () => {
    const proposal = buildExtractedTasksProposal(
      'transcript',
      [{ title: 'A' }, { title: 'B' }],
      strings,
    );

    expect(proposal.proposedTitle).toBe('2 tasks');
    expect(proposal.proposedChanges).toEqual(['A', 'B']);
    expect(proposal.items.map((task) => task.id)).toEqual(['task-proposal-0', 'task-proposal-1']);
  });
});
