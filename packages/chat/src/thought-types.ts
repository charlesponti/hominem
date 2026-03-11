/**
 * Shared domain types for the thought lifecycle.
 *
 * Import from @hominem/chat-services in both mobile and Notes web.
 * No surface may redefine these locally.
 */

import type { ThoughtLifecycleState } from './lifecycle-state';

// ─── Artifact ─────────────────────────────────────────────────────────────────

/**
 * The four canonical artifact types.
 *
 * v1 ships note-only. The other three are present in the UI as disabled buttons.
 * The API must not return 'task', 'task_list', or 'tracker' until those types
 * are explicitly enabled. Clients fall back to 'note' if an unexpected type arrives.
 */
export type ArtifactType = 'note' | 'task' | 'task_list' | 'tracker';

/** Artifact types enabled in the current release. */
export const ENABLED_ARTIFACT_TYPES: ArtifactType[] = ['note'];

/** Returns true if the given type is enabled for creation in the current release. */
export function isArtifactTypeEnabled(type: ArtifactType): boolean {
  return ENABLED_ARTIFACT_TYPES.includes(type);
}

// ─── Session Source ────────────────────────────────────────────────────────────

/**
 * Describes where a session originated.
 *
 * Displayed in the ContextAnchor in the session header. Never absent — a
 * session with no explicit source uses kind 'new'.
 */
export type SessionSource =
  | { kind: 'thought'; preview: string }
  | { kind: 'artifact'; id: string; type: ArtifactType; title: string }
  | { kind: 'new' };

// ─── Review Queue ──────────────────────────────────────────────────────────────

/**
 * A pending AI proposal awaiting user review.
 *
 * Shown as a ProposalCard on HomeView when reviewQueue.length > 0.
 */
export interface ReviewItem {
  id: string;
  /** The session that generated this proposal. */
  sessionId: string;
  proposedType: ArtifactType;
  proposedTitle: string;
  /** Human-readable summary of what the artifact would contain. */
  proposedChanges: string[];
  previewContent: string;
  createdAt: string;
}

// ─── CaptureBar ───────────────────────────────────────────────────────────────

/**
 * Props contract for the CaptureBar component (web and mobile).
 *
 * CaptureBar is the single canonical entry point for all user-initiated thoughts.
 * It is persistent: mounted in the layout shell, not per-route.
 */
export interface CaptureBarProps {
  /** Current lifecycle state — drives disabled/loading appearance. */
  state: ThoughtLifecycleState;
  /**
   * Called when the user submits text via the "Save" action.
   * Always triggers classifying → reviewing_changes → persisting.
   * There is no direct-save bypass.
   */
  onSave: (text: string) => void;
  /**
   * Called when the user chooses "Think through it".
   * Creates or resumes a session with the typed text as the seed message.
   */
  onStartSession: (seedText: string) => void;
  /**
   * Called when the user taps the voice button.
   * Transitions to 'recording' state.
   */
  onStartRecording?: () => void;
  placeholder?: string;
}

// ─── Classification Review ────────────────────────────────────────────────────

/**
 * Props contract for the ClassificationReview component (web dialog / mobile bottom sheet).
 *
 * Rendered when state enters 'reviewing_changes'. The user accepts (persist)
 * or rejects (return to idle). No implicit dismissal on backdrop tap.
 */
export interface ClassificationReviewProps {
  proposedType: ArtifactType;
  proposedTitle: string;
  /** Human-readable list of what the artifact contains or changes. */
  proposedChanges: string[];
  /** Rendered preview of the proposed artifact content. */
  previewContent: string;
  /** Called when the user taps "Save Note" (accept). Triggers persisting state. */
  onAccept: () => void;
  /** Called when the user taps "Discard" (reject). Returns to idle. */
  onReject: () => void;
}

// ─── Classification API Contract ─────────────────────────────────────────────

/**
 * Request body sent to the classification endpoint.
 *
 * POST /api/chat/:chatId/classify
 */
export interface ClassificationRequest {
  /** The chat ID whose messages are being classified. */
  chatId: string;
  /**
   * The artifact type to classify as.
   * In v1, always 'note'. Clients must pass this explicitly; the server
   * does not infer the type.
   */
  targetType: ArtifactType;
}

/**
 * Response body returned by the classification endpoint on success.
 *
 * The client uses this to populate ClassificationReview.
 * In v1, proposedType is always 'note'. If the server returns anything else,
 * the client falls back to 'note' and logs a warning.
 */
export interface ClassificationResponse {
  proposedType: ArtifactType;
  proposedTitle: string;
  /** Ordered list of human-readable change descriptions. Max 5 items. */
  proposedChanges: string[];
  /** Markdown string of the proposed artifact body. */
  previewContent: string;
  /** Server-generated review item ID. Used to accept or reject via API. */
  reviewItemId: string;
}

/**
 * Request body to accept a review item (persist the artifact).
 *
 * POST /api/review/:reviewItemId/accept
 */
export interface ReviewAcceptRequest {
  reviewItemId: string;
  /** Optional user-edited title that overrides the proposed title. */
  finalTitle?: string;
}

/**
 * Request body to reject a review item (discard the proposal).
 *
 * POST /api/review/:reviewItemId/reject
 */
export interface ReviewRejectRequest {
  reviewItemId: string;
}
