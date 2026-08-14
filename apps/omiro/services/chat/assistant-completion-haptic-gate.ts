/**
 * Coordinates the assistant-completion haptic between two independent
 * completion paths for the same stream:
 *
 * - The AppState "backgrounded" reconcile, which only touches the query
 *   cache and fires the haptic itself when it finds the server already has
 *   the reply.
 * - The mutation's own onSuccess/onError, which still resolves on its own
 *   schedule (streamSSE isn't cancelled by the reconcile) and would
 *   otherwise fire the haptic again for the same message.
 *
 * markCompletedViaBackgroundReconcile records which message the reconcile
 * path already handled; consumeForMutationSettle asks (and clears) whether
 * the mutation settle handler still needs to fire the haptic itself.
 */
export function createAssistantCompletionHapticGate() {
  let completedViaBackgroundReconcileId: string | null = null;

  return {
    markCompletedViaBackgroundReconcile(assistantMessageId: string) {
      completedViaBackgroundReconcileId = assistantMessageId;
    },
    consumeForMutationSettle(assistantMessageId: string | undefined): boolean {
      if (assistantMessageId !== undefined && completedViaBackgroundReconcileId === assistantMessageId) {
        completedViaBackgroundReconcileId = null;
        return false;
      }
      return true;
    },
  };
}

export type AssistantCompletionHapticGate = ReturnType<typeof createAssistantCompletionHapticGate>;
