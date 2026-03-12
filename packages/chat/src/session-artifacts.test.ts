import { describe, expect, it } from 'vitest';

import { buildNoteProposal, deriveSessionSource, getThoughtPreview } from './session-artifacts';

describe('deriveSessionSource', () => {
  it('prefers artifact lineage when artifact context is present', () => {
    expect(
      deriveSessionSource({
        artifactId: 'note-1',
        artifactTitle: 'Saved note',
        artifactType: 'note',
        messages: [{ role: 'user', content: 'Seed thought' }],
      }),
    ).toEqual({
      kind: 'artifact',
      id: 'note-1',
      type: 'note',
      title: 'Saved note',
    });
  });

  it('derives a thought source from the first user message when no artifact exists', () => {
    expect(
      deriveSessionSource({
        messages: [
          { role: 'assistant', content: 'How can I help?' },
          { role: 'user', content: '  Turn this into a project plan  ' },
        ],
      }),
    ).toEqual({
      kind: 'thought',
      preview: 'Turn this into a project plan',
    });
  });

  it('falls back to new when there is no artifact or user thought', () => {
    expect(
      deriveSessionSource({
        messages: [{ role: 'assistant', content: 'No user thought yet' }],
      }),
    ).toEqual({ kind: 'new' });
  });
});

describe('getThoughtPreview', () => {
  it('truncates long thought previews', () => {
    expect(
      getThoughtPreview([
        {
          role: 'user',
          content:
            'This is a very long thought that should be truncated once it exceeds the preview limit for the context anchor component on both surfaces.',
        },
      ]),
    ).toMatch(/…$/);
  });
});

describe('buildNoteProposal', () => {
  it('builds a note proposal from a session transcript', () => {
    expect(
      buildNoteProposal([
        { role: 'user', content: 'Plan the launch checklist' },
        { role: 'assistant', content: 'Start with owners, dates, and rollout risks.' },
      ]),
    ).toEqual({
      proposedType: 'note',
      proposedTitle: 'Plan the launch checklist',
      proposedChanges: ['Captured 2 messages from this session', 'Includes assistant output'],
      previewContent:
        'User: Plan the launch checklist\n\nAssistant: Start with owners, dates, and rollout risks.',
    });
  });
});
