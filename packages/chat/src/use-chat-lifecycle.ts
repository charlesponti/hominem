/**
 * Shared chat lifecycle hook.
 *
 * Manages the ThoughtLifecycleState machine, pendingReview, and resolvedSource
 * for both mobile (sherpa) and web chat sessions. Platform-specific async
 * operations (classification strategy, persist mechanism) are injected via
 * callbacks so each surface stays free of the other's dependencies.
 */

import { useCallback, useMemo, useReducer } from 'react'

import { isBlockingState, type ThoughtLifecycleState } from './lifecycle-state'
import { deriveSessionSource, type SessionArtifactMessage } from './session-artifacts'
import type { ArtifactType, SessionSource } from './thought-types'

// ─── Pending Review ───────────────────────────────────────────────────────────

/**
 * A review proposal awaiting user confirmation.
 *
 * `reviewItemId` is present only in the server-side classification flow (web).
 * Client-side proposals (mobile) omit it.
 */
export interface PendingReview {
  reviewItemId?: string
  proposedType: ArtifactType
  proposedTitle: string
  proposedChanges: string[]
  previewContent: string
}

// ─── State / Reducer ──────────────────────────────────────────────────────────

interface LifecycleState {
  lifecycleState: ThoughtLifecycleState
  pendingReview: PendingReview | null
  persistedSource: SessionSource | null
}

type LifecycleAction =
  | { type: 'set-lifecycle'; lifecycleState: ThoughtLifecycleState }
  | { type: 'set-pending-review'; pendingReview: PendingReview | null }
  | { type: 'set-persisted-source'; persistedSource: SessionSource | null }

const initialLifecycleState: LifecycleState = {
  lifecycleState: 'idle',
  pendingReview: null,
  persistedSource: null,
}

function lifecycleReducer(state: LifecycleState, action: LifecycleAction): LifecycleState {
  switch (action.type) {
    case 'set-lifecycle':
      return { ...state, lifecycleState: action.lifecycleState }
    case 'set-pending-review':
      return { ...state, pendingReview: action.pendingReview }
    case 'set-persisted-source':
      return { ...state, persistedSource: action.persistedSource }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseChatLifecycleInput {
  /**
   * Normalized messages for source derivation and proposal building.
   * Map your platform's message type to `{ role, content }` before passing.
   */
  messages: SessionArtifactMessage[]
  /**
   * The session's initial source (e.g. an artifact anchor or 'new').
   * Overridden by `persistedSource` once the user saves a note.
   */
  source: SessionSource
  /**
   * Platform-specific classification: either calls the server (web) or builds
   * a proposal client-side (mobile). Must resolve to a `PendingReview`.
   */
  onTransform: (type: ArtifactType) => Promise<PendingReview>
  /**
   * Platform-specific persistence: creates the note and returns the new
   * SessionSource that the header should display.
   */
  onAcceptReview: (review: PendingReview) => Promise<SessionSource>
  /**
   * Platform-specific rejection: calls the server to discard the ReviewItem
   * (web) or is a no-op (mobile). State is always reset by the hook.
   */
  onRejectReview: (review: PendingReview) => Promise<void>
  /** Called when any lifecycle phase throws. Use to show toasts / alerts. */
  onError: (phase: 'transform' | 'accept' | 'reject', error: unknown) => void
}

export function useChatLifecycle({
  messages,
  source,
  onTransform,
  onAcceptReview,
  onRejectReview,
  onError,
}: UseChatLifecycleInput) {
  const [state, dispatch] = useReducer(lifecycleReducer, initialLifecycleState)

  const isLifecycleBlocked =
    isBlockingState(state.lifecycleState) || state.lifecycleState === 'reviewing_changes'

  const canTransform = messages.length > 0 && !isLifecycleBlocked

  const resolvedSource = useMemo(
    () =>
      state.persistedSource ??
      (source.kind === 'artifact' ? source : deriveSessionSource({ messages })),
    [messages, source, state.persistedSource],
  )

  const statusCopy = useMemo(() => {
    if (state.lifecycleState === 'classifying') return 'Preparing note review'
    if (state.lifecycleState === 'reviewing_changes') return 'Review ready'
    if (state.lifecycleState === 'persisting') return 'Saving note'
    if (messages.length > 0)
      return `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`
    return 'New conversation'
  }, [state.lifecycleState, messages.length])

  const handleTransform = useCallback(
    async (type: ArtifactType) => {
      dispatch({ type: 'set-lifecycle', lifecycleState: 'classifying' })
      try {
        const review = await onTransform(type)
        dispatch({ type: 'set-lifecycle', lifecycleState: 'reviewing_changes' })
        dispatch({ type: 'set-pending-review', pendingReview: review })
      } catch (error) {
        dispatch({ type: 'set-lifecycle', lifecycleState: 'idle' })
        onError('transform', error)
      }
    },
    [onError, onTransform],
  )

  const handleAcceptReview = useCallback(async () => {
    if (!state.pendingReview) return
    dispatch({ type: 'set-lifecycle', lifecycleState: 'persisting' })
    try {
      const nextSource = await onAcceptReview(state.pendingReview)
      dispatch({ type: 'set-persisted-source', persistedSource: nextSource })
      dispatch({ type: 'set-lifecycle', lifecycleState: 'idle' })
      dispatch({ type: 'set-pending-review', pendingReview: null })
    } catch (error) {
      dispatch({ type: 'set-lifecycle', lifecycleState: 'reviewing_changes' })
      onError('accept', error)
    }
  }, [onAcceptReview, onError, state.pendingReview])

  const handleRejectReview = useCallback(async () => {
    if (!state.pendingReview) return
    try {
      await onRejectReview(state.pendingReview)
    } finally {
      dispatch({ type: 'set-lifecycle', lifecycleState: 'idle' })
      dispatch({ type: 'set-pending-review', pendingReview: null })
    }
  }, [onRejectReview, state.pendingReview])

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
  }
}
