import type { ResumeImportDiff } from '@hominem/queues';
import { describe, expect, it } from 'vitest';

import type { SseResumeEvent } from '~/lib/resume-import/types';

import { createResumeImportState, resumeImportReducer, scalarKey } from './resume-import.reducer';

const diff: ResumeImportDiff = {
  portfolioSlugProposed: 'jane-doe',
  scalarChanges: [
    {
      field: 'headline',
      group: 'basics',
      label: 'Headline',
      current: 'Engineer',
      proposed: 'Staff Engineer',
    },
  ],
  listChanges: [
    {
      key: 'work-1',
      group: 'workExperience',
      summary: 'Staff Engineer at Hominem',
      payload: {},
    },
  ],
};

describe('resumeImportReducer', () => {
  it('initializes an idle workflow or resumes an existing job', () => {
    expect(createResumeImportState()).toMatchObject({ phase: 'idle', jobId: null });
    expect(createResumeImportState('job-1')).toMatchObject({
      phase: 'analyzing',
      jobId: 'job-1',
    });
  });

  it('moves a completed analysis into review with all changes selected', () => {
    const event = {
      jobId: 'job-1',
      stage: 'done',
      label: 'Ready to review',
      percent: 100,
      diff,
    } satisfies SseResumeEvent;

    const state = resumeImportReducer(createResumeImportState('job-1'), {
      type: 'review-ready',
      diff,
      event,
    });

    expect(state.phase).toBe('reviewing');
    expect(state.diff).toBe(diff);
    expect(state.selectedScalarKeys).toEqual(new Set([scalarKey(diff.scalarChanges[0])]));
    expect(state.selectedListKeys).toEqual(new Set(['work-1']));
  });

  it('toggles selections without mutating the previous state', () => {
    const initial = resumeImportReducer(createResumeImportState(), {
      type: 'review-ready',
      diff,
      event: {
        jobId: 'job-1',
        stage: 'done',
        label: 'Ready to review',
        percent: 100,
        diff,
      },
    });

    const next = resumeImportReducer(initial, {
      type: 'toggle-scalar',
      key: 'basics.headline',
      checked: false,
    });

    expect(next.selectedScalarKeys).toEqual(new Set());
    expect(initial.selectedScalarKeys).toEqual(new Set(['basics.headline']));
  });

  it('tracks apply failures and resets the workflow', () => {
    const applying = resumeImportReducer(createResumeImportState('job-1'), {
      type: 'apply-started',
    });
    const failed = resumeImportReducer(applying, {
      type: 'apply-failed',
      message: 'Could not apply changes',
    });

    expect(failed).toMatchObject({ phase: 'reviewing', applyError: 'Could not apply changes' });
    expect(resumeImportReducer(failed, { type: 'reset' })).toEqual(createResumeImportState());
  });
});
