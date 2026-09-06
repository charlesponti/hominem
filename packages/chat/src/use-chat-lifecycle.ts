// Shared chat lifecycle hook — drives the CaptureLifecycleState machine,
// pendingReview, and resolvedSource for both mobile and web chat sessions.
// Platform-specific async work (classification, persisting) gets injected as
// callbacks so neither surface has to know about the other's dependencies.

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

import type { ArtifactType, ClassificationProposal, SessionSource } from './capture-types';
import type { ChatClient, ChatGenerationController } from './client';
import type { ChatMessageSnapshot } from './generation-schemas';
import { isBlockingState, type CaptureLifecycleState } from './lifecycle-state';
import { deriveSessionSource } from './session-artifacts';

// A review proposal waiting on user confirmation. `reviewItemId` only shows
// up in the server-side (web) flow — mobile's client-side proposals skip it.
// `items` only shows up for multi-task extraction: when it's set, list each
// item in the review UI instead of just proposedTitle/proposedChanges, and
// accepting creates one artifact per item.
export interface PendingReview extends ClassificationProposal {
  reviewItemId?: string;
  items?: { title: string; description?: string }[];
}

interface LifecycleState<TReview extends PendingReview> {
  lifecycleState: CaptureLifecycleState;
  pendingReview: TReview | null;
  persistedSource: SessionSource | null;
}

type LifecycleAction<TReview extends PendingReview> =
  | { type: 'set-lifecycle'; lifecycleState: CaptureLifecycleState }
  | { type: 'set-pending-review'; pendingReview: TReview | null }
  | { type: 'set-persisted-source'; persistedSource: SessionSource | null };

function getInitialLifecycleState<TReview extends PendingReview>(): LifecycleState<TReview> {
  return { lifecycleState: 'idle', pendingReview: null, persistedSource: null };
}

function lifecycleReducer<TReview extends PendingReview>(
  state: LifecycleState<TReview>,
  action: LifecycleAction<TReview>,
): LifecycleState<TReview> {
  switch (action.type) {
    case 'set-lifecycle':
      return { ...state, lifecycleState: action.lifecycleState };
    case 'set-pending-review':
      return { ...state, pendingReview: action.pendingReview };
    case 'set-persisted-source':
      return { ...state, persistedSource: action.persistedSource };
  }
}

export interface UseChatLifecycleInput<TReview extends PendingReview = PendingReview> {
  // Normalized messages for source derivation and proposal building — map
  // your platform's message type to `{ role, content }` before passing it in
  messages: readonly Pick<ChatMessageSnapshot, 'role' | 'content'>[];
  // The session's initial source (e.g. an artifact anchor or 'new'), gets
  // overridden by `persistedSource` once the user saves a note
  source: SessionSource;
  // Platform-specific classification — either hits the server (web) or
  // builds a proposal client-side (mobile), must resolve to a PendingReview
  onTransform: (type: ArtifactType) => Promise<TReview>;
  // Platform-specific persistence — creates the note and returns the new
  // SessionSource for the header to show
  onAcceptReview: (review: TReview) => Promise<SessionSource>;
  // Platform-specific rejection discards any server-side review item.
  // (web) or does nothing (mobile); the hook resets state either way
  onRejectReview: (review: TReview) => Promise<void>;
  // Called when any lifecycle phase throws, e.g. to show a toast
  onError: (phase: 'transform' | 'accept' | 'reject', error: unknown) => void;
}

export function useChatLifecycle<TReview extends PendingReview = PendingReview>({
  messages,
  source,
  onTransform,
  onAcceptReview,
  onRejectReview,
  onError,
}: UseChatLifecycleInput<TReview>) {
  const [state, dispatch] = useReducer(
    lifecycleReducer<TReview>,
    undefined,
    getInitialLifecycleState<TReview>,
  );

  const isLifecycleBlocked =
    isBlockingState(state.lifecycleState) || state.lifecycleState === 'reviewing_changes';

  const canTransform = messages.length > 0 && !isLifecycleBlocked;

  const resolvedSource = useMemo(
    () =>
      state.persistedSource ??
      (source.kind === 'artifact' ? source : deriveSessionSource({ messages })),
    [messages, source, state.persistedSource],
  );

  const statusCopy = useMemo(() => {
    if (state.lifecycleState === 'classifying') return 'Preparing review';
    if (state.lifecycleState === 'reviewing_changes') return 'Review ready';
    if (state.lifecycleState === 'persisting') return 'Saving artifact';
    if (messages.length > 0)
      return `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`;
    return 'New conversation';
  }, [state.lifecycleState, messages.length]);

  const handleTransform = useCallback(
    async (type: ArtifactType) => {
      dispatch({ type: 'set-lifecycle', lifecycleState: 'classifying' });
      try {
        const review = await onTransform(type);
        dispatch({ type: 'set-lifecycle', lifecycleState: 'reviewing_changes' });
        dispatch({ type: 'set-pending-review', pendingReview: review });
      } catch (error) {
        dispatch({ type: 'set-lifecycle', lifecycleState: 'idle' });
        onError('transform', error);
      }
    },
    [onError, onTransform],
  );

  const handleAcceptReview = useCallback(async () => {
    if (!state.pendingReview) return;
    dispatch({ type: 'set-lifecycle', lifecycleState: 'persisting' });
    try {
      const nextSource = await onAcceptReview(state.pendingReview);
      dispatch({ type: 'set-persisted-source', persistedSource: nextSource });
      dispatch({ type: 'set-lifecycle', lifecycleState: 'idle' });
      dispatch({ type: 'set-pending-review', pendingReview: null });
    } catch (error) {
      dispatch({ type: 'set-lifecycle', lifecycleState: 'reviewing_changes' });
      onError('accept', error);
    }
  }, [onAcceptReview, onError, state.pendingReview]);

  const handleRejectReview = useCallback(async () => {
    if (!state.pendingReview) return;
    try {
      await onRejectReview(state.pendingReview);
    } finally {
      dispatch({ type: 'set-lifecycle', lifecycleState: 'idle' });
      dispatch({ type: 'set-pending-review', pendingReview: null });
    }
  }, [onRejectReview, state.pendingReview]);

  return {
    lifecycleState: state.lifecycleState,
    pendingReview: state.pendingReview,
    resolvedSource,
    isLifecycleBlocked,
    canTransform,
    statusCopy,
    isReviewVisible: state.lifecycleState === 'reviewing_changes',
    handleTransform,
    handleAcceptReview,
    handleRejectReview,
  };
}

/** React binding for the framework-neutral generation controller. */
export function useChatGeneration(client: ChatClient) {
  const [controller] = useState<ChatGenerationController>(() => client.createGeneration());
  const [state, setState] = useState(controller.state);

  useEffect(() => controller.subscribe((next) => setState(next)), [controller]);

  return {
    ...controller,
    state,
  };
}
