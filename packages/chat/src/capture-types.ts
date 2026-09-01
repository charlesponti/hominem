// Shared domain types for the capture lifecycle. These are the canonical
// definitions — @hominem/rpc re-exports them for transport consumers, and no
// other package should redefine them.

export type ArtifactType = 'note' | 'task' | 'task_list';

export const ENABLED_ARTIFACT_TYPES: ArtifactType[] = ['note', 'task', 'task_list'];

export function isArtifactTypeEnabled(type: ArtifactType): boolean {
  return ENABLED_ARTIFACT_TYPES.includes(type);
}

export type SessionSource =
  | { kind: 'capture'; preview: string }
  | { kind: 'artifact'; id: string; type: ArtifactType; title: string }
  | { kind: 'new' };

export type CaptureLifecycleState =
  | 'idle'
  | 'composing'
  | 'recording'
  | 'transcribing'
  | 'classifying'
  | 'reviewing_changes'
  | 'persisting'
  | 'recovering_error';

export type CaptureLifecycleTransition = [from: CaptureLifecycleState, to: CaptureLifecycleState];

export interface ClassificationProposal {
  proposedType: ArtifactType;
  proposedTitle: string;
  proposedChanges: string[];
  previewContent: string;
}

export interface ReviewItem extends ClassificationProposal {
  id: string;
  sessionId: string;
  createdAt: string;
}

export interface CaptureBarProps {
  state: CaptureLifecycleState;
  onSave: (text: string) => void;
  onStartSession: (seedText: string) => void;
  onStartRecording?: () => void;
  placeholder?: string;
}

export interface ClassificationReviewProps extends ClassificationProposal {
  onAccept: () => void;
  onReject: () => void;
}

export const CHAT_TITLE_MAX_LENGTH = 64;
