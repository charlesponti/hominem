import type {
  ResumeImportDiff,
  ResumeListItemChange,
  ResumeScalarFieldChange,
} from '@hominem/queues';

import type { SseResumeEvent } from '~/lib/resume-import/types';

type ResumeImportPhase = 'idle' | 'uploading' | 'analyzing' | 'reviewing' | 'applying' | 'error';

export interface ResumeImportState {
  phase: ResumeImportPhase;
  jobId: string | null;
  stageEvent: SseResumeEvent | null;
  diff: ResumeImportDiff | null;
  selectedScalarKeys: Set<string>;
  selectedListKeys: Set<string>;
  applyError: string | null;
}

export type ResumeImportAction =
  | { type: 'analysis-started'; jobId: string }
  | { type: 'analysis-uploading' }
  | { type: 'analysis-failed'; message: string }
  | { type: 'stage-received'; event: SseResumeEvent }
  | { type: 'review-ready'; diff: ResumeImportDiff; event: SseResumeEvent }
  | { type: 'toggle-scalar'; key: string; checked: boolean }
  | { type: 'toggle-list'; key: string; checked: boolean }
  | { type: 'apply-started' }
  | { type: 'apply-failed'; message: string }
  | { type: 'reset' };

export function createResumeImportState(jobId: string | null = null): ResumeImportState {
  return {
    phase: jobId ? 'analyzing' : 'idle',
    jobId,
    stageEvent: null,
    diff: null,
    selectedScalarKeys: new Set(),
    selectedListKeys: new Set(),
    applyError: null,
  };
}

function toggleKey(keys: Set<string>, key: string, checked: boolean) {
  const next = new Set(keys);
  if (checked) next.add(key);
  else next.delete(key);
  return next;
}

export function scalarKey(change: ResumeScalarFieldChange) {
  return `${change.group}.${change.field}`;
}

export function groupListChanges(changes: ResumeListItemChange[]) {
  const groups = new Map<ResumeListItemChange['group'], ResumeListItemChange[]>();
  for (const change of changes) {
    const existing = groups.get(change.group) ?? [];
    existing.push(change);
    groups.set(change.group, existing);
  }
  return groups;
}

export function groupScalarChanges(changes: ResumeScalarFieldChange[]) {
  const groups = new Map<ResumeScalarFieldChange['group'], ResumeScalarFieldChange[]>();
  for (const change of changes) {
    const existing = groups.get(change.group) ?? [];
    existing.push(change);
    groups.set(change.group, existing);
  }
  return groups;
}

export function resumeImportReducer(
  state: ResumeImportState,
  action: ResumeImportAction,
): ResumeImportState {
  switch (action.type) {
    case 'analysis-uploading':
      return { ...state, phase: 'uploading', applyError: null };
    case 'analysis-started':
      return { ...state, phase: 'analyzing', jobId: action.jobId, applyError: null };
    case 'analysis-failed':
      return { ...state, phase: 'idle', applyError: action.message };
    case 'stage-received':
      return {
        ...state,
        stageEvent: action.event,
        phase: action.event.error ? 'error' : state.phase,
        applyError: action.event.error ? (action.event.errorMessage ?? null) : state.applyError,
      };
    case 'review-ready':
      return {
        ...state,
        phase: 'reviewing',
        stageEvent: action.event,
        diff: action.diff,
        selectedScalarKeys: new Set(action.diff.scalarChanges.map(scalarKey)),
        selectedListKeys: new Set(action.diff.listChanges.map((item) => item.key)),
        applyError: null,
      };
    case 'toggle-scalar':
      return {
        ...state,
        selectedScalarKeys: toggleKey(state.selectedScalarKeys, action.key, action.checked),
      };
    case 'toggle-list':
      return {
        ...state,
        selectedListKeys: toggleKey(state.selectedListKeys, action.key, action.checked),
      };
    case 'apply-started':
      return { ...state, phase: 'applying', applyError: null };
    case 'apply-failed':
      return { ...state, phase: 'reviewing', applyError: action.message };
    case 'reset':
      return createResumeImportState();
  }
}
