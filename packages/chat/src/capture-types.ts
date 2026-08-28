/**
 * Shared domain types for the capture lifecycle.
 *
 * These are the CANONICAL definitions. @hominem/rpc re-exports them
 * for transport consumers. No other package may redefine these.
 */

export type ArtifactType = 'note' | 'task' | 'task_list';

/** Artifact types enabled in the current release. */
export const ENABLED_ARTIFACT_TYPES: ArtifactType[] = ['note', 'task', 'task_list'];

/** Returns true if the given type is enabled for creation in the current release. */
export function isArtifactTypeEnabled(type: ArtifactType): boolean {
  return ENABLED_ARTIFACT_TYPES.includes(type);
}

/** Describes where a chat session originated. */
export type SessionSource =
  | { kind: 'capture'; preview: string }
  | { kind: 'artifact'; id: string; type: ArtifactType; title: string }
  | { kind: 'new' };

/** The canonical capture lifecycle state machine. */
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

/** A pending AI proposal awaiting user review. */
export interface ReviewItem extends ClassificationProposal {
  id: string;
  sessionId: string;
  createdAt: string;
}

/** Props contract for the CaptureBar component (web and mobile). */
export interface CaptureBarProps {
  state: CaptureLifecycleState;
  onSave: (text: string) => void;
  onStartSession: (seedText: string) => void;
  onStartRecording?: () => void;
  placeholder?: string;
}

/** Props contract for the ClassificationReview component. */
export interface ClassificationReviewProps extends ClassificationProposal {
  onAccept: () => void;
  onReject: () => void;
}

/** Maximum character length for a chat/artifact title. */
export const CHAT_TITLE_MAX_LENGTH = 64;
