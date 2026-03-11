import { describe, expect, it } from 'vitest';

import {
  ENABLED_ARTIFACT_TYPES,
  isArtifactTypeEnabled,
  type ArtifactType,
  type ClassificationResponse,
  type SessionSource,
} from './thought-types';

// ─── ArtifactType ─────────────────────────────────────────────────────────────

describe('ENABLED_ARTIFACT_TYPES', () => {
  it('enables only note in v1', () => {
    expect(ENABLED_ARTIFACT_TYPES).toEqual(['note']);
  });

  it('has exactly one enabled type in v1', () => {
    expect(ENABLED_ARTIFACT_TYPES).toHaveLength(1);
  });
});

describe('isArtifactTypeEnabled', () => {
  it('returns true for note', () => {
    expect(isArtifactTypeEnabled('note')).toBe(true);
  });

  it('returns false for task, task_list, and tracker', () => {
    const disabled: ArtifactType[] = ['task', 'task_list', 'tracker'];
    for (const type of disabled) {
      expect(isArtifactTypeEnabled(type), `expected disabled: ${type}`).toBe(false);
    }
  });

  it('is consistent with ENABLED_ARTIFACT_TYPES', () => {
    const all: ArtifactType[] = ['note', 'task', 'task_list', 'tracker'];
    for (const type of all) {
      expect(isArtifactTypeEnabled(type)).toBe(ENABLED_ARTIFACT_TYPES.includes(type));
    }
  });
});

// ─── SessionSource ────────────────────────────────────────────────────────────

describe('SessionSource discriminant union', () => {
  it('kind: new — no additional fields required', () => {
    const source: SessionSource = { kind: 'new' };
    expect(source.kind).toBe('new');
  });

  it('kind: thought — requires preview', () => {
    const source: SessionSource = { kind: 'thought', preview: 'raw capture text' };
    expect(source.kind).toBe('thought');
    expect(source.preview).toBe('raw capture text');
  });

  it('kind: artifact — requires id, type, and title', () => {
    const source: SessionSource = {
      kind: 'artifact',
      id: 'note_abc',
      type: 'note',
      title: 'My note',
    };
    expect(source.kind).toBe('artifact');
    expect(source.id).toBe('note_abc');
    expect(source.type).toBe('note');
    expect(source.title).toBe('My note');
  });
});

// ─── ClassificationResponse fallback contract ─────────────────────────────────

describe('ClassificationResponse — v1 safety contract', () => {
  /**
   * The spec mandates: "If the server returns anything other than 'note', the
   * client falls back to 'note' and logs a warning."
   *
   * This test documents the expected consumer-side fallback behaviour.
   */
  function safeProposedType(response: ClassificationResponse): ArtifactType {
    return isArtifactTypeEnabled(response.proposedType) ? response.proposedType : 'note';
  }

  it('passes through note without change', () => {
    const response: ClassificationResponse = {
      proposedType: 'note',
      proposedTitle: 'My note',
      proposedChanges: [],
      previewContent: '',
      reviewItemId: 'rev_1',
    };
    expect(safeProposedType(response)).toBe('note');
  });

  it('falls back to note when server returns a disabled type', () => {
    const disabledTypes: ArtifactType[] = ['task', 'task_list', 'tracker'];
    for (const disabledType of disabledTypes) {
      const response: ClassificationResponse = {
        proposedType: disabledType,
        proposedTitle: 'Some title',
        proposedChanges: [],
        previewContent: '',
        reviewItemId: 'rev_x',
      };
      expect(safeProposedType(response), `should fall back from ${disabledType}`).toBe('note');
    }
  });
});
